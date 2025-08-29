import { Request, Response } from "express";
import { UserService, CreateUserDto, LoginDto, UpdateUserDto } from "../services/UserService";

export class UserController {
  private static service: UserService = new UserService();

  // POST /users/register - Registrar nuevo usuario
  async register(req: Request, res: Response): Promise<any> {
    try {
      const userData: CreateUserDto = req.body;
      
      // Validaciones básicas
      if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos son obligatorios: firstName, lastName, email, password"
        });
      }

      const result = await UserController.service.register(userData);
      
      const statusCode = result.success ? 201 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      console.error("Error en registro:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/login - Iniciar sesión
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

      const result = await UserController.service.login(loginData);
      
      const statusCode = result.success ? 200 : 401;
      res.status(statusCode).json(result);

    } catch (err) {
      console.error("Error en login:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users/profile - Obtener perfil del usuario autenticado
  async getProfile(req: Request, res: Response): Promise<any> {
    try {
      // El usuario viene del middleware de autenticación
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
        user: user
      });

    } catch (err) {
      console.error("Error al obtener perfil:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // PUT /users/profile - Actualizar perfil del usuario autenticado
  async updateProfile(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const updateData: UpdateUserDto = req.body;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado"
        });
      }

      const result = await UserController.service.updateUser(user.id, updateData);
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // POST /users/change-password - Cambiar contraseña
  async changePassword(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user;
      const { oldPassword, newPassword } = req.body;
      
      if (!user) {
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

      const result = await UserController.service.changePassword(user.id, oldPassword, newPassword);
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users - Obtener todos los usuarios (solo admin)
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
      console.error("Error al obtener usuarios:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users/:id - Obtener usuario por ID (solo admin)
  async getUserById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID de usuario es requerido"
        });
      }

      const user = await UserController.service.getUserById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado"
        });
      }

      res.status(200).json({
        success: true,
        message: "Usuario obtenido exitosamente",
        user: user
      });

    } catch (err) {
      console.error("Error al obtener usuario:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // PUT /users/:id - Actualizar usuario por ID (solo admin)
  async updateUser(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const updateData: UpdateUserDto = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID de usuario es requerido"
        });
      }

      const result = await UserController.service.updateUser(id, updateData);
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // DELETE /users/:id - Eliminar usuario (solo admin)
  async deleteUser(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID de usuario es requerido"
        });
      }

      // Evitar que un admin se elimine a sí mismo
      const currentUser = req.user;
      if (currentUser && currentUser.id === id) {
        return res.status(400).json({
          success: false,
          message: "No puedes eliminar tu propia cuenta"
        });
      }

      const result = await UserController.service.deleteUser(id);
      
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }

  // GET /users/validate-token - Validar token JWT
  async validateToken(req: Request, res: Response): Promise<any> {
    try {
      // Si llegamos aquí, el token es válido (pasó por el middleware de autenticación)
      const user = req.user;
      
      res.status(200).json({
        success: true,
        message: "Token válido",
        user: user
      });

    } catch (err) {
      console.error("Error al validar token:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  }
} 