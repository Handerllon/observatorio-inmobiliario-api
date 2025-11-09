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
    // Todas las rutas requieren autenticación con ID Token
    // Usamos authenticateWithProfile para tener acceso al email del usuario en los logs
    
    // Obtener historial de predicciones con filtros
    router.get(
      `${this.prefix}`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.getUserPredictions
    );

    // Obtener predicciones recientes
    router.get(
      `${this.prefix}/recent`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.getRecentPredictions
    );

    // Obtener estadísticas del usuario
    router.get(
      `${this.prefix}/statistics`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.getUserStatistics
    );

    // Obtener solo favoritos
    router.get(
      `${this.prefix}/favorites`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.getFavoritePredictions
    );

    // Obtener una predicción específica
    router.get(
      `${this.prefix}/:id`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.getPredictionById
    );

    // Marcar/desmarcar como favorita
    router.post(
      `${this.prefix}/:id/favorite`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.toggleFavorite
    );

    // Actualizar notas de una predicción
    router.put(
      `${this.prefix}/:id/notes`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.updateNotes
    );

    // Eliminar una predicción
    router.delete(
      `${this.prefix}/:id`,
      CognitoMiddleware.authenticateWithProfile,
      this.controller.deletePrediction
    );
  }
}

