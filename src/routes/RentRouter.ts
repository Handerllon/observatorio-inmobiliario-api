import { Router } from "express";
import { RentController } from "../controllers/RentController";
import { CognitoMiddleware } from "../middleware/cognito.middleware";

export class RentRouter {
  private controller: RentController;
  private prefix: string = "/rent";

  constructor() {
    this.controller = new RentController();
  }

  public routes(router: Router): void {
    router.post(`${this.prefix}`, this.controller.index);
    
    // Predict ahora usa autenticación opcional con perfil completo
    // Esto permite guardar el email del usuario en los logs y en la base de datos
    // Si no hay token o es inválido, permite acceso anónimo
    router.post(
      `${this.prefix}/predict`,
      CognitoMiddleware.optionalAuthenticateWithProfile,
      this.controller.predict
    );
  }
}
