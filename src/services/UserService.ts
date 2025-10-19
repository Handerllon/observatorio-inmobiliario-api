import { AppDataSource } from "../DataSource";
import { User } from "../entities/User.entity";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { validate } from "class-validator";

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  userType?: "Propietario" | "Agente" | "Inquilino";
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: any;
  token?: string;
}

export class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private jwtSecret = process.env.JWT_SECRET || "default-secret-key";

  async register(userData: CreateUserDto): Promise<AuthResponse> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        return {
          success: false,
          message: "Ya existe un usuario con este email"
        };
      }

      // Crear nuevo usuario
      const user = new User();
      user.firstName = userData.firstName;
      user.lastName = userData.lastName;
      user.email = userData.email.toLowerCase();
      user.password = userData.password;
      user.role = userData.role || "user";

      // Validar los datos
      const errors = await validate(user);
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(", ")
        ).join("; ");
        
        return {
          success: false,
          message: `Errores de validación: ${errorMessages}`
        };
      }

      // Guardar usuario (el hash de contraseña se hace automáticamente por @BeforeInsert)
      const savedUser = await this.userRepository.save(user);

      // Generar token
      const token = this.generateToken(savedUser);

      return {
        success: true,
        message: "Usuario registrado exitosamente",
        user: savedUser,
        token
      };

    } catch (error) {
      console.error("Error en registro:", error);
      return {
        success: false,
        message: "Error interno del servidor"
      };
    }
  }

  async login(loginData: LoginDto): Promise<AuthResponse> {
    try {
      // Buscar usuario por email
      const user = await this.userRepository.findOne({
        where: { 
          email: loginData.email.toLowerCase(),
          isActive: true 
        }
      });

      if (!user) {
        return {
          success: false,
          message: "Credenciales inválidas"
        };
      }

      // Validar contraseña
      const isValidPassword = await user.validatePassword(loginData.password);
      
      if (!isValidPassword) {
        return {
          success: false,
          message: "Credenciales inválidas"
        };
      }

      // Generar token
      const token = this.generateToken(user);

      return {
        success: true,
        message: "Login exitoso",
        user: user,
        token
      };

    } catch (error) {
      console.error("Error en login:", error);
      return {
        success: false,
        message: "Error interno del servidor"
      };
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id, isActive: true }
      });
    } catch (error) {
      console.error("Error al obtener usuario:", error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { isActive: true },
        order: { createdAt: "DESC" }
      });
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      return [];
    }
  }

  async updateUser(id: string, updateData: UpdateUserDto): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id }
      });

      if (!user) {
        return {
          success: false,
          message: "Usuario no encontrado"
        };
      }

      // Si se está actualizando el email, verificar que no exista otro usuario con el mismo
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: updateData.email.toLowerCase() }
        });

        if (existingUser) {
          return {
            success: false,
            message: "Ya existe un usuario con este email"
          };
        }
      }

      // Actualizar campos
      if (updateData.firstName) user.firstName = updateData.firstName;
      if (updateData.lastName) user.lastName = updateData.lastName;
      if (updateData.email) user.email = updateData.email.toLowerCase();
      if (updateData.role) user.role = updateData.role;
      if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

      // Validar los datos actualizados
      const errors = await validate(user);
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(", ")
        ).join("; ");
        
        return {
          success: false,
          message: `Errores de validación: ${errorMessages}`
        };
      }

      const updatedUser = await this.userRepository.save(user);

      return {
        success: true,
        message: "Usuario actualizado exitosamente",
        user: updatedUser
      };

    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      return {
        success: false,
        message: "Error interno del servidor"
      };
    }
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id }
      });

      if (!user) {
        return {
          success: false,
          message: "Usuario no encontrado"
        };
      }

      // Verificar contraseña actual
      const isValidPassword = await user.validatePassword(oldPassword);
      
      if (!isValidPassword) {
        return {
          success: false,
          message: "Contraseña actual incorrecta"
        };
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        return {
          success: false,
          message: "La nueva contraseña debe tener al menos 6 caracteres"
        };
      }

      // Actualizar contraseña
      user.password = await bcrypt.hash(newPassword, 12);
      await this.userRepository.save(user);

      return {
        success: true,
        message: "Contraseña actualizada exitosamente"
      };

    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      return {
        success: false,
        message: "Error interno del servidor"
      };
    }
  }

  async deleteUser(id: string): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findOne({
        where: { id }
      });

      if (!user) {
        return {
          success: false,
          message: "Usuario no encontrado"
        };
      }

      // Soft delete - marcamos como inactivo
      user.isActive = false;
      await this.userRepository.save(user);

      return {
        success: true,
        message: "Usuario eliminado exitosamente"
      };

    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      return {
        success: false,
        message: "Error interno del servidor"
      };
    }
  }

  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: "24h"
    });
  }
} 