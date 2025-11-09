import { Request, Response } from "express";
import { RentPredictionService, PredictionFilters } from "../services/RentPredictionService";
import { logger } from "../utils/Logger";

export class RentPredictionController {
  private static service: RentPredictionService = new RentPredictionService();

  /**
   * GET /predictions - Obtener historial de predicciones del usuario autenticado
   */
  async getUserPredictions(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a /predictions");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      logger.info(`📋 Usuario ${user.email} obteniendo historial de predicciones`);

      // Obtener filtros del query params
      const filters: PredictionFilters = {
        cognitoSub: user.sub,
        status: req.query.status as any,
        barrio: req.query.barrio as string,
        dormitorios: req.query.dormitorios ? parseInt(req.query.dormitorios as string) : undefined,
        isFavorite: req.query.isFavorite === "true" ? true : undefined,
      };

      // Filtros de fecha
      if (req.query.dateFrom) {
        filters.dateFrom = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        filters.dateTo = new Date(req.query.dateTo as string);
      }

      // Filtros de precio
      if (req.query.minPrecio) {
        filters.minPrecio = parseFloat(req.query.minPrecio as string);
      }
      if (req.query.maxPrecio) {
        filters.maxPrecio = parseFloat(req.query.maxPrecio as string);
      }

      const predictions = await RentPredictionController.service.getPredictions(filters);

      res.status(200).json({
        success: true,
        message: "Predicciones obtenidas exitosamente",
        predictions,
        total: predictions.length,
      });
    } catch (err) {
      logger.error("Error al obtener predicciones:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * GET /predictions/recent - Obtener predicciones recientes
   */
  async getRecentPredictions(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a /predictions/recent");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      logger.info(`📋 Usuario ${user.email} obteniendo predicciones recientes (limit: ${limit})`);
      
      const predictions = await RentPredictionController.service.getRecentPredictions(
        user.sub,
        limit
      );

      res.status(200).json({
        success: true,
        message: "Predicciones recientes obtenidas exitosamente",
        predictions,
        total: predictions.length,
      });
    } catch (err) {
      logger.error("Error al obtener predicciones recientes:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * GET /predictions/:id - Obtener una predicción específica
   */
  async getPredictionById(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a /predictions/:id");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      logger.debug(`Usuario ${user.email} solicitando predicción ID: ${id}`);

      const prediction = await RentPredictionController.service.getPredictionById(id);

      if (!prediction) {
        logger.warning(`Predicción ${id} no encontrada`);
        return res.status(404).json({
          success: false,
          message: "Predicción no encontrada",
        });
      }

      // Verificar que la predicción pertenezca al usuario
      if (prediction.cognitoSub !== user.sub) {
        logger.warning(`Usuario ${user.email} intentó acceder a predicción de otro usuario (${id})`);
        return res.status(403).json({
          success: false,
          message: "No tienes permiso para acceder a esta predicción",
        });
      }

      res.status(200).json({
        success: true,
        message: "Predicción obtenida exitosamente",
        prediction,
      });
    } catch (err) {
      logger.error("Error al obtener predicción:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * POST /predictions/:id/favorite - Marcar/desmarcar predicción como favorita
   */
  async toggleFavorite(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a /predictions/:id/favorite");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      logger.info(`⭐ Usuario ${user.email} toggling favorite para predicción ${id}`);

      const prediction = await RentPredictionController.service.toggleFavorite(
        id,
        user.sub
      );

      if (!prediction) {
        logger.warning(`Predicción ${id} no encontrada o no pertenece al usuario`);
        return res.status(404).json({
          success: false,
          message: "Predicción no encontrada",
        });
      }

      logger.info(`Predicción ${id} ${prediction.isFavorite ? "marcada como" : "removida de"} favoritos`);

      res.status(200).json({
        success: true,
        message: `Predicción ${prediction.isFavorite ? "agregada a" : "removida de"} favoritos`,
        prediction,
      });
    } catch (err) {
      logger.error("Error al actualizar favorito:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * PUT /predictions/:id/notes - Agregar/actualizar notas a una predicción
   */
  async updateNotes(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const { id } = req.params;
      const { notes } = req.body;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a /predictions/:id/notes");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      if (notes === undefined || notes === null) {
        logger.warning(`Usuario ${user.email} intentó actualizar notas sin campo 'notes'`);
        return res.status(400).json({
          success: false,
          message: "El campo 'notes' es requerido en el body. Ejemplo: { \"notes\": \"Mi nota\" }",
        });
      }

      logger.info(`📝 Usuario ${user.email} actualizando notas para predicción ${id}`);

      const prediction = await RentPredictionController.service.addNotes(
        id,
        user.sub,
        notes
      );

      if (!prediction) {
        logger.warning(`Predicción ${id} no encontrada o no pertenece al usuario`);
        return res.status(404).json({
          success: false,
          message: "Predicción no encontrada",
        });
      }

      res.status(200).json({
        success: true,
        message: "Notas actualizadas exitosamente",
        prediction,
      });
    } catch (err) {
      logger.error("Error al actualizar notas:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * DELETE /predictions/:id - Eliminar una predicción
   */
  async deletePrediction(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a DELETE /predictions/:id");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      logger.info(`🗑️  Usuario ${user.email} eliminando predicción ${id}`);

      const deleted = await RentPredictionController.service.deletePrediction(
        id,
        user.sub
      );

      if (!deleted) {
        logger.warning(`Predicción ${id} no encontrada o no pertenece al usuario`);
        return res.status(404).json({
          success: false,
          message: "Predicción no encontrada",
        });
      }

      logger.info(`Predicción ${id} eliminada exitosamente`);

      res.status(200).json({
        success: true,
        message: "Predicción eliminada exitosamente",
      });
    } catch (err) {
      logger.error("Error al eliminar predicción:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * GET /predictions/statistics - Obtener estadísticas de predicciones del usuario
   */
  async getUserStatistics(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a /predictions/statistics");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      logger.info(`📊 Usuario ${user.email} obteniendo estadísticas`);

      const statistics = await RentPredictionController.service.getUserStatistics(
        user.sub
      );

      res.status(200).json({
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        statistics,
      });
    } catch (err) {
      logger.error("Error al obtener estadísticas:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * GET /predictions/favorites - Obtener solo predicciones favoritas
   */
  async getFavoritePredictions(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;

      if (!user) {
        logger.warning("Intento de acceso no autenticado a /predictions/favorites");
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
      }

      logger.info(`⭐ Usuario ${user.email} obteniendo predicciones favoritas`);

      const predictions = await RentPredictionController.service.getPredictions({
        cognitoSub: user.sub,
        isFavorite: true,
      });

      res.status(200).json({
        success: true,
        message: "Predicciones favoritas obtenidas exitosamente",
        predictions,
        total: predictions.length,
      });
    } catch (err) {
      logger.error("Error al obtener predicciones favoritas:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
}

