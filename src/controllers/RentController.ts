import { Request, Response } from "express";
import { RentService } from "../services/RentService";
import { RentPredictionService, CreatePredictionDto } from "../services/RentPredictionService";
import { PredictionStatus } from "../entities/RentPrediction.entity";
import { AwsAdapter } from "../utils/AwsAdapter";
import { OverpassAdapter } from "../utils/OverpassAdapter";
import { logger } from "../utils/Logger";

/**
 * RentController
 * 
 * Responsabilidades:
 * - Recibir requests HTTP
 * - Validar datos de entrada
 * - Orquestar llamadas a servicios externos (AWS, Overpass) y persistencia
 * - Retornar respuestas al cliente
 */
export class RentController {
  private static rentService: RentService = new RentService();
  private static predictionService: RentPredictionService = new RentPredictionService();
  private static awsAdapter: AwsAdapter = new AwsAdapter();
  private static overpassAdapter: OverpassAdapter = new OverpassAdapter();

  async index(req: Request, res: Response): Promise<any> {
    try {
        const result = {
          body: "Index Response"
        } 
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send(err);
    }
  }

  /**
   * Endpoint principal de predicción de alquiler
   * 
   * Flujo:
   * 1. Validar datos de entrada
   * 2. Obtener predicción desde AWS Lambda (via AwsAdapter)
   * 3. Obtener imágenes y métricas desde S3 (via AwsAdapter)
   * 4. Obtener coordenadas (via AwsAdapter - Amazon Location Service)
   * 5. Buscar lugares cercanos (via OverpassAdapter - OpenStreetMap)
   * 6. Guardar predicción en base de datos (via RentService)
   * 7. Retornar respuesta completa
   */
  async predict(req: Request, res: Response): Promise<any> {
    const startTime = Date.now();
    let predictionRecord = null;

    try {
        const user = req.user;
        
        logger.info(`🎯 Iniciando proceso de predicción - Usuario: ${user ? user.email : "Anónimo"}`);

        // PASO 1: Obtener datos de AWS en paralelo
        // - Lambda: Predicción ML + imágenes + métricas (todo en executePrediction)
        // - Location Service: Geocodificación (coordenadas)
        logger.debug("📡 Obteniendo datos desde AWS (Lambda + Location)...");
        
        const [predictionResult, coordinates] = await Promise.all([
          RentController.awsAdapter.executePrediction(req.body),
          RentController.awsAdapter.getCoordinates(
            req.body.calle || req.body.street || null,
            req.body.barrio || req.body.neighborhood || null
          )
        ]);
        
        logger.info("✅ Predicción obtenida exitosamente desde AWS");

        // PASO 2: Buscar lugares cercanos usando Overpass (solo si hay coordenadas)
        let nearbyPlaces = null;
        if (coordinates) {
          logger.debug(`📍 Buscando lugares cercanos con Overpass para coords: ${coordinates.lat}, ${coordinates.lng}`);
          nearbyPlaces = await RentController.overpassAdapter.getNearbyPlaces(
            coordinates.lat,
            coordinates.lng
          );
          logger.info(`✅ Lugares cercanos obtenidos: ${nearbyPlaces?.summary?.total || 0} lugares`);
        } else {
          logger.warning("⚠️  No se pudieron obtener coordenadas, omitiendo lugares cercanos");
        }

        // PASO 3: Crear registro de predicción inicial (si hay usuario)
        if (user) {
          const predictionData: CreatePredictionDto = {
            cognitoSub: user.sub,
            userEmail: user.email,
            // Mapear campos pre-generación desde input_data
            barrio: predictionResult.input_data?.barrio,
            ambientes: predictionResult.input_data?.ambientes,
            metrosCuadradosMin: predictionResult.input_data?.metrosCuadradosMin,
            metrosCuadradosMax: predictionResult.input_data?.metrosCuadradosMax,
            dormitorios: predictionResult.input_data?.dormitorios,
            banos: predictionResult.input_data?.banos,
            garajes: predictionResult.input_data?.garajes,
            antiguedad: predictionResult.input_data?.antiguedad,
            calle: predictionResult.input_data?.calle,
          };

          logger.debug("💾 Guardando predicción en base de datos...");
          predictionRecord = await RentController.predictionService.createPrediction(predictionData);
          logger.info(`✅ Predicción guardada con ID: ${predictionRecord?.id}`);
        }

        // PASO 4: Calcular tiempo de ejecución
        const executionTimeMs = Date.now() - startTime;
        logger.info(`⏱️  Tiempo de ejecución total: ${executionTimeMs}ms`);

        // PASO 5: Actualizar registro con resultado exitoso (si hay usuario)
        if (predictionRecord) {
          await RentController.predictionService.updatePrediction(predictionRecord.id, {
            // Guardar resultados de predicción
            precioCotaInferior: predictionResult.predictionMin || predictionResult.prediction,
            precioCotaSuperior: predictionResult.predictionMax || predictionResult.prediction,
            moneda: "ARS",
            // Guardar datos adicionales (JSON)
            images: predictionResult.images || {},
            metrics: predictionResult.metrics || {},
            nearbyPlaces: nearbyPlaces || {},
            // Metadatos
            status: PredictionStatus.SUCCESS,
            executionTimeMs: executionTimeMs,
          });
        }

        // PASO 6: Retornar respuesta completa
        const response = {
          ...predictionResult,
          nearby_places: nearbyPlaces,
          predictionId: predictionRecord?.id || null,
          executionTimeMs: executionTimeMs,
          timestamp: new Date().toISOString()
        };

        logger.info("🎉 Predicción completada exitosamente");
        return res.status(200).json(response);

    } catch (err) {
        const executionTimeMs = Date.now() - startTime;
        logger.error("❌ Error en proceso de predicción:", err);

        // Actualizar registro como error (si existe)
        if (predictionRecord) {
          try {
            await RentController.predictionService.updatePrediction(predictionRecord.id, {
              status: PredictionStatus.ERROR,
              errorMessage: err instanceof Error ? err.message : "Error desconocido",
              executionTimeMs: executionTimeMs,
            });
            logger.debug(`Registro de error guardado para predicción ${predictionRecord.id}`);
          } catch (updateErr) {
            logger.error("Error al actualizar registro de predicción con error:", updateErr);
          }
        }

        // Retornar error al cliente
        return res.status(500).json({
          error: true,
          message: err instanceof Error ? err.message : "Error desconocido en predicción",
          executionTimeMs: executionTimeMs
        });
    }
  }
}
