import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { CognitoMiddleware } from "../middleware/cognito.middleware";

export class UserRouter {
  private controller: UserController;
  private prefix: string = "/users";

  constructor() {
    this.controller = new UserController();
  }

  public routes(router: Router): void {
    // Rutas públicas (no requieren autenticación)
    router.post(`${this.prefix}/register`, this.controller.register);
    router.post(`${this.prefix}/login`, this.controller.login);
    router.post(`${this.prefix}/confirm`, this.controller.confirmSignUp);
    router.post(`${this.prefix}/forgot-password`, this.controller.forgotPassword);
    router.post(`${this.prefix}/confirm-forgot-password`, this.controller.confirmForgotPassword);

    // Rutas que requieren autenticación con Cognito
    router.get(
      `${this.prefix}/profile`, 
      CognitoMiddleware.authenticate, 
      this.controller.getProfile
    );
    
    router.put(
      `${this.prefix}/profile`, 
      CognitoMiddleware.authenticate, 
      this.controller.updateProfile
    );
    
    router.post(
      `${this.prefix}/change-password`, 
      CognitoMiddleware.authenticate, 
      this.controller.changePassword
    );
    
    router.get(
      `${this.prefix}/validate-token`, 
      CognitoMiddleware.authenticate, 
      this.controller.validateToken
    );

    router.post(
      `${this.prefix}/logout`, 
      CognitoMiddleware.authenticate, 
      this.controller.logout
    );

    // Rutas de administración (requieren autenticación y grupo admin de Cognito)
    router.get(
      `${this.prefix}`, 
      CognitoMiddleware.authenticate, 
      CognitoMiddleware.authorize(["admin"]), 
      this.controller.getAllUsers
    );
    
    router.get(
      `${this.prefix}/:id`, 
      CognitoMiddleware.authenticate, 
      CognitoMiddleware.authorize(["admin"]), 
      this.controller.getUserById
    );
    
    router.put(
      `${this.prefix}/:id`, 
      CognitoMiddleware.authenticate, 
      CognitoMiddleware.authorize(["admin"]), 
      this.controller.updateUser
    );
    
    router.delete(
      `${this.prefix}/:id`, 
      CognitoMiddleware.authenticate, 
      CognitoMiddleware.authorize(["admin"]), 
      this.controller.deleteUser
    );
  }
} 