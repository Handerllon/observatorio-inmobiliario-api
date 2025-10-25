import { Request, Response } from "express";
import { UserService, CreateUserDto, LoginDto, UpdateUserDto } from "../services/UserService";
import { CognitoService, RegisterDto } from "../services/CognitoService";
import { logger } from "../utils/Logger";

export class UserController {
  private static service: UserService = new UserService();
  private static cognitoService: CognitoService = new CognitoService();

  // POST /users/register - Registrar nuevo usuario en Cognito
  async register(req: Request, res: Response): Promise<any> {
    try {
      const userData: RegisterDto = req.body;
      
      // Validaciones básicas
      if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos son obligatorios: firstName, lastName, email, password"
        });
      }

      // Validar userType si se proporciona
      if (userData.userType && !["Propietario", "Agente", "Inquilino"].includes(userData.userType)) {
        return res.status(400).json({
          success: false,
          message: "userType debe ser 'Propietario', 'Agente' o 'Inquilino'"
        });
      }

      const result = await UserController.cognitoService.register(userData);
      
      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error en registro:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/login - Iniciar sesión con Cognito
  async login(req: Request, res: Response): Promise<any> {
    try {
      const loginData: LoginDto = req.body;
      
      // Validaciones básicas
      if (!loginData.email || !loginData.password) {
        return res.status(400).json({
          success: false,
          message: "Email y contraseña son obligatorios"
        });
      }

      const result = await UserController.cognitoService.login(loginData);
      
      const statusCode = result.success ? 200 : 401;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error en login:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users/profile - Obtener perfil del usuario autenticado desde Cognito
  async getProfile(req: Request, res: Response): Promise<any> {
    try {
      // El usuario viene del middleware de autenticación de Cognito
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
      }

      res.status(200).json({
        success: true,
        message: "Perfil obtenido exitosamente",
        user: {
          id: user.sub,
          email: user.email,
          firstName: user.given_name,
          lastName: user.family_name,
          username: user.username,
          groups: user.groups,
          emailVerified: user.email_verified,
          userType: user.user_type
        }
      });

    } catch (err) {
      logger.error("Error al obtener perfil:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // PUT /users/profile - Actualizar perfil del usuario autenticado en Cognito
  async updateProfile(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const updateData = req.body;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
      }

      // Validar userType si se proporciona
      if (updateData.userType && !["Propietario", "Agente", "Inquilino"].includes(updateData.userType)) {
        return res.status(400).json({
          success: false,
          message: "userType debe ser 'Propietario', 'Agente' o 'Inquilino'"
        });
      }

      // Construir atributos para actualizar en Cognito
      const attributes: { [key: string]: string } = {};
      if (updateData.firstName) attributes.given_name = updateData.firstName;
      if (updateData.lastName) attributes.family_name = updateData.lastName;
      if (updateData.email) attributes.email = updateData.email;
      if (updateData.userType) attributes["custom:user_type"] = updateData.userType;

      const result = await UserController.cognitoService.adminUpdateUserAttributes(
        user.username,
        attributes
      );
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error al actualizar perfil:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/change-password - Cambiar contraseña en Cognito
  async changePassword(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const { oldPassword, newPassword } = req.body;
      const accessToken = req.headers.authorization?.split(" ")[1];
      
      if (!user || !accessToken) {
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
      }

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "La contraseña actual y la nueva contraseña son obligatorias"
        });
      }

      const result = await UserController.cognitoService.changePassword(
        accessToken,
        oldPassword,
        newPassword
      );
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error al cambiar contraseña:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users - Obtener todos los usuarios desde la base de datos local (solo admin)
  // Nota: Cognito no tiene un endpoint simple para listar todos los usuarios
  // Esta funcionalidad mantiene la base de datos local para consultas
  async getAllUsers(req: Request, res: Response): Promise<any> {
    try {
      const users = await UserController.service.getAllUsers();
      
      res.status(200).json({
        success: true,
        message: "Usuarios obtenidos exitosamente",
        users: users,
        total: users.length
      });

    } catch (err) {
      logger.error("Error al obtener usuarios:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users/:username - Obtener usuario por username desde Cognito (solo admin)
  async getUserById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params; // En realidad es el username de Cognito
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Username de usuario es requerido"
        });
      }

      const result = await UserController.cognitoService.adminGetUser(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json({
        success: true,
        message: "Usuario obtenido exitosamente",
        user: result.data
      });

    } catch (err) {
      logger.error("Error al obtener usuario:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // PUT /users/:username - Actualizar usuario por username en Cognito (solo admin)
  async updateUser(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params; // username
      const updateData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Username de usuario es requerido"
        });
      }

      // Validar userType si se proporciona
      if (updateData.userType && !["Propietario", "Agente", "Inquilino"].includes(updateData.userType)) {
        return res.status(400).json({
          success: false,
          message: "userType debe ser 'Propietario', 'Agente' o 'Inquilino'"
        });
      }

      // Construir atributos para actualizar
      const attributes: { [key: string]: string } = {};
      if (updateData.firstName) attributes.given_name = updateData.firstName;
      if (updateData.lastName) attributes.family_name = updateData.lastName;
      if (updateData.email) attributes.email = updateData.email;
      if (updateData.userType) attributes["custom:user_type"] = updateData.userType;

      const result = await UserController.cognitoService.adminUpdateUserAttributes(
        id,
        attributes
      );
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error al actualizar usuario:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // DELETE /users/:username - Deshabilitar usuario en Cognito (solo admin)
  async deleteUser(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params; // username
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Username de usuario es requerido"
        });
      }

      // Evitar que un admin se deshabilite a sí mismo
      const currentUser = req.user;
      if (currentUser && currentUser.username === id) {
        return res.status(400).json({
          success: false,
          message: "No puedes deshabilitar tu propia cuenta"
        });
      }

      const result = await UserController.cognitoService.adminDisableUser(id);
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error al deshabilitar usuario:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users/validate-token - Validar token de Cognito
  async validateToken(req: Request, res: Response): Promise<any> {
    try {
      // Si llegamos aquí, el token es válido (pasó por el middleware de autenticación de Cognito)
      const user = req.user;
      
      res.status(200).json({
        success: true,
        message: "Token válido",
        user: {
          id: user?.sub,
          email: user?.email,
          firstName: user?.given_name,
          lastName: user?.family_name,
          username: user?.username,
          groups: user?.groups,
          emailVerified: user?.email_verified,
          userType: user?.user_type
        }
      });

    } catch (err) {
      logger.error("Error al validar token:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/confirm - Confirmar registro con código de verificación
  async confirmSignUp(req: Request, res: Response): Promise<any> {
    try {
      const { email, confirmationCode } = req.body;

      if (!email || !confirmationCode) {
        return res.status(400).json({
          success: false,
          message: "Email y código de confirmación son obligatorios"
        });
      }

      const result = await UserController.cognitoService.confirmSignUp(
        email,
        confirmationCode
      );

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error al confirmar registro:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/forgot-password - Iniciar recuperación de contraseña
  async forgotPassword(req: Request, res: Response): Promise<any> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email es obligatorio"
        });
      }

      const result = await UserController.cognitoService.forgotPassword(email);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error en forgot password:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/confirm-forgot-password - Confirmar nueva contraseña
  async confirmForgotPassword(req: Request, res: Response): Promise<any> {
    try {
      const { email, confirmationCode, newPassword } = req.body;

      if (!email || !confirmationCode || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Email, código de confirmación y nueva contraseña son obligatorios"
        });
      }

      const result = await UserController.cognitoService.confirmForgotPassword(
        email,
        confirmationCode,
        newPassword
      );

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error al confirmar nueva contraseña:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/logout - Cerrar sesión global
  async logout(req: Request, res: Response): Promise<any> {
    try {
      const accessToken = req.headers.authorization?.split(" ")[1];

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: "Token de acceso requerido"
        });
      }

      const result = await UserController.cognitoService.globalSignOut(accessToken);

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      logger.error("Error al cerrar sesión:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }
} 