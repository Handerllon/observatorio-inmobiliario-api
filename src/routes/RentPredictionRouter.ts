import { Router } from "express";
import { RentPredictionController } from "../controllers/RentPredictionController";
import { CognitoMiddleware } from "../middleware/cognito.middleware";

export class RentPredictionRouter {
  private controller: RentPredictionController;
  private prefix: string = "/predictions";

  constructor() {
    this.controller = new RentPredictionController();
  }

  public routes(router: Router): void {
    // Todas las rutas requieren autenticación
    
    // Obtener historial de predicciones con filtros
    router.get(
      `${this.prefix}`,
      CognitoMiddleware.authenticate,
      this.controller.getUserPredictions
    );

    // Obtener predicciones recientes
    router.get(
      `${this.prefix}/recent`,
      CognitoMiddleware.authenticate,
      this.controller.getRecentPredictions
    );

    // Obtener estadísticas del usuario
    router.get(
      `${this.prefix}/statistics`,
      CognitoMiddleware.authenticate,
      this.controller.getUserStatistics
    );

    // Obtener solo favoritos
    router.get(
      `${this.prefix}/favorites`,
      CognitoMiddleware.authenticate,
      this.controller.getFavoritePredictions
    );

    // Obtener una predicción específica
    router.get(
      `${this.prefix}/:id`,
      CognitoMiddleware.authenticate,
      this.controller.getPredictionById
    );

    // Marcar/desmarcar como favorita
    router.post(
      `${this.prefix}/:id/favorite`,
      CognitoMiddleware.authenticate,
      this.controller.toggleFavorite
    );

    // Actualizar notas de una predicción
    router.put(
      `${this.prefix}/:id/notes`,
      CognitoMiddleware.authenticate,
      this.controller.updateNotes
    );

    // Eliminar una predicción
    router.delete(
      `${this.prefix}/:id`,
      CognitoMiddleware.authenticate,
      this.controller.deletePrediction
    );
  }
}

