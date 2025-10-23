import { Request, Response } from "express";
import { RentService } from "../services/RentService";
import { RentPredictionService, CreatePredictionDto } from "../services/RentPredictionService";
import { PredictionStatus } from "../entities/RentPrediction.entity";

export class RentController {
  private static service: RentService = new RentService();
  private static predictionService: RentPredictionService = new RentPredictionService();

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

  async predict(req: Request, res: Response): Promise<any> {
    const startTime = Date.now();
    let predictionRecord = null;

    try {
        const user = req.user;

        // Crear registro de predicción inicial
        if (user) {
          const predictionData: CreatePredictionDto = {
            cognitoSub: user.sub,
            userEmail: user.email,
            // Mapear campos pre-generación
            barrio: req.body.barrio || req.body.neighborhood,
            ambientes: req.body.ambientes || req.body.rooms,
            metrosCuadradosMin: req.body.metrosCuadradosMin || req.body.surface_min,
            metrosCuadradosMax: req.body.metrosCuadradosMax || req.body.surface_max,
            dormitorios: req.body.dormitorios || req.body.bedrooms,
            banos: req.body.banos || req.body.bathrooms,
            garajes: req.body.garajes || req.body.garages,
            antiguedad: req.body.antiguedad || req.body.age,
            calle: req.body.calle || req.body.street,
          };

          predictionRecord = await RentController.predictionService.createPrediction(predictionData);
        }

        // Ejecutar predicción
        const result = await RentController.service.executePrediction(req.body);

        if (result.includes("No se pudo obtener")) {
            // Actualizar registro como error
            if (predictionRecord) {
              await RentController.predictionService.updatePrediction(predictionRecord.id, {
                status: PredictionStatus.ERROR,
                errorMessage: "No se pudo obtener ubicaciones cercanas",
                executionTimeMs: Date.now() - startTime,
              });
            }
            return res.status(500).send("Error al obtener ubicaciones cercanas");
        }

        // Replace single quotes with double quotes
        const correctedString = result.replace(/'/g, '"');

        // Parse the corrected string into a JSON object
        const jsonObject = JSON.parse(correctedString);

        // Actualizar registro con resultado exitoso
        if (predictionRecord) {
          await RentController.predictionService.updatePrediction(predictionRecord.id, {
            // Mapear campos post-generación (resultados)
            inmueblesDisponibles: jsonObject.inmuebles_disponibles || jsonObject.available_properties,
            publicacionesRemovidas: jsonObject.publicaciones_removidas || jsonObject.removed_publications,
            publicacionesNuevas: jsonObject.publicaciones_nuevas || jsonObject.new_publications,
            precioCotaInferior: jsonObject.precio_cota_inferior || jsonObject.price_min,
            precioCotaSuperior: jsonObject.precio_cota_superior || jsonObject.price_max,
            moneda: jsonObject.moneda || jsonObject.currency || "ARS",
            status: PredictionStatus.SUCCESS,
            executionTimeMs: Date.now() - startTime,
          });
        }

        res.status(200).send({
          result: jsonObject,
          predictionId: predictionRecord?.id, // Incluir ID para referencia
        });
    } catch (err) {
        console.log(err);

        // Actualizar registro como error
        if (predictionRecord) {
          await RentController.predictionService.updatePrediction(predictionRecord.id, {
            status: PredictionStatus.ERROR,
            errorMessage: err instanceof Error ? err.message : "Error desconocido",
            executionTimeMs: Date.now() - startTime,
          });
        }

        res.status(500).send(err);
    }
  }
}
