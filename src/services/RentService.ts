import { logger } from "../utils/Logger";

/**
 * RentService
 * 
 * Servicio enfocado únicamente en la persistencia de datos relacionados a rentas.
 * No maneja integraciones externas (AWS, APIs, etc.)
 * 
 * Responsabilidades:
 * - Guardar predicciones en base de datos
 * - Consultar historial de predicciones
 * - Validar datos antes de persistir
 * - Operaciones CRUD relacionadas a rentas
 */
export class RentService {

  /**
   * Valida los datos de predicción antes de guardar
   * 
   * @param predictionData - Datos de la predicción
   * @returns true si los datos son válidos
   */
  validatePredictionData(predictionData: any): boolean {
    // Validar campos requeridos
    if (!predictionData.barrio) {
      throw new Error("El campo 'barrio' es requerido");
    }

    // Validar que al menos uno de los valores de predicción exista
    const hasValidPrediction = 
      predictionData.prediction || 
      (predictionData.predictionMin && predictionData.predictionMax);

    if (!hasValidPrediction) {
      throw new Error("Debe haber al menos un valor de predicción");
    }

    return true;
  }

  /**
   * Prepara los datos para ser guardados en la base de datos
   * Normaliza el formato y agrega metadata
   * 
   * @param predictionData - Datos crudos de la predicción
   * @param userId - ID del usuario (opcional)
   * @returns Objeto preparado para persistir
   */
  preparePredictionForDB(predictionData: any, userId?: string): any {
    const timestamp = new Date();

    return {
      // Metadatos
      userId: userId || null,
      createdAt: timestamp,
      updatedAt: timestamp,

      // Datos de entrada
      barrio: predictionData.input_data?.barrio || null,
      ambientes: predictionData.input_data?.ambientes || null,
      metrosCuadradosMin: predictionData.input_data?.metrosCuadradosMin || null,
      metrosCuadradosMax: predictionData.input_data?.metrosCuadradosMax || null,
      dormitorios: predictionData.input_data?.dormitorios || null,
      banos: predictionData.input_data?.banos || null,
      garajes: predictionData.input_data?.garajes || null,
      antiguedad: predictionData.input_data?.antiguedad || null,
      calle: predictionData.input_data?.calle || null,

      // Resultados de predicción
      prediction: predictionData.prediction || null,
      predictionMin: predictionData.predictionMin || null,
      predictionMax: predictionData.predictionMax || null,

      // Imágenes (guardar como JSON)
      images: JSON.stringify(predictionData.images || {}),

      // Input completo (para re-ejecución)
      inputData: JSON.stringify(predictionData.input_data || {}),

      // Estado
      status: 'completed'
    };
  }

  /**
   * Guarda una predicción en la base de datos
   * 
   * @param predictionData - Datos de la predicción
   * @param userId - ID del usuario
   * @returns Predicción guardada
   */
  async savePrediction(predictionData: any, userId?: string): Promise<any> {
    try {
      // Validar datos
      this.validatePredictionData(predictionData);

      // Preparar para DB
      const dbData = this.preparePredictionForDB(predictionData, userId);

      logger.debug("💾 Guardando predicción en base de datos...");
      logger.debug("📊 Datos:", JSON.stringify(dbData, null, 2));

      // TODO: Implementar guardado real en base de datos
      // const savedPrediction = await predictionRepository.save(dbData);
      // return savedPrediction;

      // Por ahora, retornar los datos preparados
      return {
        id: `pred_${Date.now()}`,
        ...dbData
      };
    } catch (error) {
      logger.error("❌ Error guardando predicción:", error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de predicciones de un usuario
   * 
   * @param userId - ID del usuario
   * @param limit - Número máximo de resultados
   * @returns Lista de predicciones
   */
  async getUserPredictionHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      logger.debug(`📖 Obteniendo historial de predicciones para usuario: ${userId}`);

      // TODO: Implementar consulta real a base de datos
      // const predictions = await predictionRepository.find({
      //   where: { userId },
      //   order: { createdAt: 'DESC' },
      //   take: limit
      // });
      // return predictions;

      // Por ahora, retornar array vacío
      return [];
    } catch (error) {
      logger.error("❌ Error obteniendo historial:", error);
      throw error;
    }
  }

  /**
   * Obtiene una predicción específica por ID
   * 
   * @param predictionId - ID de la predicción
   * @returns Predicción encontrada
   */
  async getPredictionById(predictionId: string): Promise<any | null> {
    try {
      logger.debug(`🔍 Buscando predicción: ${predictionId}`);

      // TODO: Implementar consulta real a base de datos
      // const prediction = await predictionRepository.findOne({
      //   where: { id: predictionId }
      // });
      // return prediction;

      // Por ahora, retornar null
      return null;
    } catch (error) {
      logger.error("❌ Error obteniendo predicción:", error);
      throw error;
    }
  }

  /**
   * Elimina una predicción
   * 
   * @param predictionId - ID de la predicción
   * @returns true si se eliminó exitosamente
   */
  async deletePrediction(predictionId: string): Promise<boolean> {
    try {
      logger.debug(`🗑️  Eliminando predicción: ${predictionId}`);

      // TODO: Implementar eliminación real de base de datos
      // await predictionRepository.delete(predictionId);
      
      return true;
    } catch (error) {
      logger.error("❌ Error eliminando predicción:", error);
      throw error;
    }
  }

  /**
   * Actualiza una predicción existente
   * 
   * @param predictionId - ID de la predicción
   * @param updateData - Datos a actualizar
   * @returns Predicción actualizada
   */
  async updatePrediction(predictionId: string, updateData: any): Promise<any> {
    try {
      logger.debug(`✏️  Actualizando predicción: ${predictionId}`);

      // TODO: Implementar actualización real en base de datos
      // const updated = await predictionRepository.update(predictionId, {
      //   ...updateData,
      //   updatedAt: new Date()
      // });
      // return updated;

      return {
        id: predictionId,
        ...updateData,
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error("❌ Error actualizando predicción:", error);
      throw error;
    }
  }
}
