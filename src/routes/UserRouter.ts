import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { AuthMiddleware } from "../middleware/auth.middleware";

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

    // Rutas que requieren autenticación
    router.get(
      `${this.prefix}/profile`, 
      AuthMiddleware.authenticate, 
      this.controller.getProfile
    );
    
    router.put(
      `${this.prefix}/profile`, 
      AuthMiddleware.authenticate, 
      this.controller.updateProfile
    );
    
    router.post(
      `${this.prefix}/change-password`, 
      AuthMiddleware.authenticate, 
      this.controller.changePassword
    );
    
    router.get(
      `${this.prefix}/validate-token`, 
      AuthMiddleware.authenticate, 
      this.controller.validateToken
    );

    // Rutas de administración (requieren autenticación y rol admin)
    router.get(
      `${this.prefix}`, 
      AuthMiddleware.authenticate, 
      AuthMiddleware.authorize(["admin"]), 
      this.controller.getAllUsers
    );
    
    router.get(
      `${this.prefix}/:id`, 
      AuthMiddleware.authenticate, 
      AuthMiddleware.authorize(["admin"]), 
      this.controller.getUserById
    );
    
    router.put(
      `${this.prefix}/:id`, 
      AuthMiddleware.authenticate, 
      AuthMiddleware.authorize(["admin"]), 
      this.controller.updateUser
    );
    
    router.delete(
      `${this.prefix}/:id`, 
      AuthMiddleware.authenticate, 
      AuthMiddleware.authorize(["admin"]), 
      this.controller.deleteUser
    );
  }
} 