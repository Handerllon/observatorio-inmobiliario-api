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
    
    // Predict ahora usa autenticación opcional - guarda si hay usuario, pero permite sin auth
    router.post(
      `${this.prefix}/predict`,
      CognitoMiddleware.optionalAuthenticate,
      this.controller.predict
    );
  }
}
