import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppDataSource } from "../DataSource";
import { User } from "../entities/User.entity";

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
}

export class AuthMiddleware {
  
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ 
          success: false, 
          message: "Token de acceso requerido" 
        });
      }

      const token = authHeader.split(" ")[1]; // Bearer TOKEN
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: "Token de acceso requerido" 
        });
      }

      const jwtSecret = process.env.JWT_SECRET || "default-secret-key";
      
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      // Buscar el usuario en la base de datos
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.id, isActive: true }
      });

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Token inválido o usuario no encontrado" 
        });
      }

      // Añadir el usuario al request
      req.user = user;
      next();

    } catch (error) {
      console.error("Error en autenticación:", error);
      return res.status(401).json({ 
        success: false, 
        message: "Token inválido" 
      });
    }
  }

  static authorize(roles: string[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: "Acceso no autorizado" 
        });
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: "No tienes permisos para acceder a este recurso" 
        });
      }

      next();
    };
  }
} 