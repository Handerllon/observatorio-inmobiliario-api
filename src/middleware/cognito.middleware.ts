import { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";

// Extender la interfaz Request para incluir información del usuario de Cognito
declare global {
  namespace Express {
    interface Request {
      user?: CognitoUser;
      cognitoPayload?: any;
    }
  }
}

export interface CognitoUser {
  sub: string; // ID único del usuario en Cognito
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  groups?: string[]; // Grupos de Cognito (roles)
  username: string;
  user_type?: "Propietario" | "Agente" | "Inquilino"; // Tipo de usuario personalizado
}

export class CognitoMiddleware {
  private static verifier: any;

  /**
   * Inicializar el verificador de JWT de Cognito
   */
  private static initVerifier() {
    if (!CognitoMiddleware.verifier) {
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      const clientId = process.env.COGNITO_CLIENT_ID;
      const region = process.env.AWS_REGION || "us-east-1";

      if (!userPoolId || !clientId) {
        throw new Error(
          "COGNITO_USER_POOL_ID y COGNITO_CLIENT_ID son requeridos"
        );
      }

      // Crear verificador para Access Tokens
      CognitoMiddleware.verifier = CognitoJwtVerifier.create({
        userPoolId: userPoolId,
        tokenUse: "access",
        clientId: clientId,
      });
    }
    return CognitoMiddleware.verifier;
  }

  /**
   * Middleware para autenticar requests con AWS Cognito
   */
  static async authenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "Token de acceso requerido",
        });
      }

      const token = authHeader.split(" ")[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token de acceso requerido",
        });
      }

      // Verificar el token con AWS Cognito
      const verifier = CognitoMiddleware.initVerifier();
      const payload = await verifier.verify(token);

      // Extraer información del usuario del token
      const user: CognitoUser = {
        sub: payload.sub,
        email: payload.email || "",
        email_verified: payload.email_verified || false,
        given_name: payload.given_name,
        family_name: payload.family_name,
        groups: payload["cognito:groups"] || [],
        username: payload.username,
        user_type: payload["custom:user_type"] as "Propietario" | "Agente" | "Inquilino" | undefined,
      };

      // Añadir el usuario y payload completo al request
      req.user = user;
      req.cognitoPayload = payload;

      next();
    } catch (error: any) {
      console.error("Error en autenticación Cognito:", error);

      // Mensajes específicos para diferentes tipos de error
      let message = "Token inválido";
      if (error.name === "JwtExpiredError") {
        message = "Token expirado";
      } else if (error.name === "JwtInvalidSignatureError") {
        message = "Firma de token inválida";
      } else if (error.name === "JwtInvalidClaimError") {
        message = "Claims del token inválidos";
      }

      return res.status(401).json({
        success: false,
        message,
      });
    }
  }

  /**
   * Middleware para autorizar basado en grupos de Cognito (roles)
   * @param groups Array de nombres de grupos permitidos
   */
  static authorize(groups: string[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Acceso no autorizado",
        });
      }

      // Si no se especifican grupos, permitir el acceso
      if (groups.length === 0) {
        return next();
      }

      // Verificar si el usuario pertenece a alguno de los grupos permitidos
      const userGroups = req.user.groups || [];
      const hasPermission = groups.some((group) =>
        userGroups.includes(group)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para acceder a este recurso",
        });
      }

      next();
    };
  }

  /**
   * Middleware opcional para autenticación (no falla si no hay token)
   * Útil para endpoints que pueden ser públicos o privados
   */
  static async optionalAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return next(); // Continuar sin autenticación
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        return next(); // Continuar sin autenticación
      }

      // Intentar verificar el token
      const verifier = CognitoMiddleware.initVerifier();
      const payload = await verifier.verify(token);

      const user: CognitoUser = {
        sub: payload.sub,
        email: payload.email || "",
        email_verified: payload.email_verified || false,
        given_name: payload.given_name,
        family_name: payload.family_name,
        groups: payload["cognito:groups"] || [],
        username: payload.username,
        user_type: payload["custom:user_type"] as "Propietario" | "Agente" | "Inquilino" | undefined,
      };

      req.user = user;
      req.cognitoPayload = payload;
    } catch (error) {
      // Si hay error, simplemente continuar sin autenticación
      console.log("Token inválido en autenticación opcional:", error);
    }

    next();
  }

  /**
   * Helper para verificar si el usuario tiene un rol específico
   */
  static hasRole(user: CognitoUser | undefined, role: string): boolean {
    if (!user || !user.groups) {
      return false;
    }
    return user.groups.includes(role);
  }

  /**
   * Helper para verificar si el usuario es admin
   */
  static isAdmin(user: CognitoUser | undefined): boolean {
    return CognitoMiddleware.hasRole(user, "admin");
  }
}

