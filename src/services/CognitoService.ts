import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
  ChangePasswordCommand,
  GlobalSignOutCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
import * as crypto from "crypto";
import { logger } from "../utils/Logger";

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  clientSecret?: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  userType?: "Propietario" | "Agente" | "Inquilino";
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CognitoResponse {
  success: boolean;
  message: string;
  data?: any;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
}

export class CognitoService {
  private client: CognitoIdentityProviderClient;
  private userPool: CognitoUserPool;
  private config: CognitoConfig;

  constructor() {
    this.config = {
      region: process.env.AWS_REGION || "us-east-1",
      userPoolId: process.env.COGNITO_USER_POOL_ID || "",
      clientId: process.env.COGNITO_CLIENT_ID || "",
      clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
    };

    // Validar configuración
    if (!this.config.userPoolId || !this.config.clientId) {
      throw new Error(
        "COGNITO_USER_POOL_ID y COGNITO_CLIENT_ID son requeridos en las variables de entorno"
      );
    }

    this.client = new CognitoIdentityProviderClient({
      region: this.config.region,
    });

    this.userPool = new CognitoUserPool({
      UserPoolId: this.config.userPoolId,
      ClientId: this.config.clientId,
    });
  }

  /**
   * Calcula el SECRET_HASH requerido por Cognito cuando el App Client tiene secret
   * @param username Email o username del usuario
   * @returns SECRET_HASH calculado con HMAC-SHA256
   */
  private calculateSecretHash(username: string): string {
    if (!this.config.clientSecret) {
      return "";
    }

    const message = username + this.config.clientId;
    const hmac = crypto.createHmac("sha256", this.config.clientSecret);
    hmac.update(message);
    return hmac.digest("base64");
  }

  /**
   * Registrar un nuevo usuario en Cognito
   */
  async register(userData: RegisterDto): Promise<CognitoResponse> {
    try {
      const username = userData.email.toLowerCase();
      const userAttributes: Array<{ Name: string; Value: string }> = [
        {
          Name: "email",
          Value: username,
        },
        {
          Name: "given_name",
          Value: userData.firstName,
        },
        {
          Name: "family_name",
          Value: userData.lastName,
        },
      ];

      // Agregar user_type si se proporciona
      if (userData.userType) {
        userAttributes.push({
          Name: "custom:user_type",
          Value: userData.userType,
        });
      }

      const params: any = {
        ClientId: this.config.clientId,
        Username: username,
        Password: userData.password,
        UserAttributes: userAttributes,
      };

      // Agregar SECRET_HASH si el client tiene secret configurado
      if (this.config.clientSecret) {
        params.SecretHash = this.calculateSecretHash(username);
      }

      const command = new SignUpCommand(params);
      const response = await this.client.send(command);

      return {
        success: true,
        message: "Usuario registrado exitosamente. Por favor verifica tu email.",
        data: {
          userSub: response.UserSub,
          userConfirmed: response.UserConfirmed,
        },
      };
    } catch (error: any) {
      logger.error("Error en registro Cognito:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Confirmar registro de usuario con código de verificación
   */
  async confirmSignUp(
    email: string,
    confirmationCode: string
  ): Promise<CognitoResponse> {
    try {
      const username = email.toLowerCase();
      const params: any = {
        ClientId: this.config.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
      };

      // Agregar SECRET_HASH si el client tiene secret configurado
      if (this.config.clientSecret) {
        params.SecretHash = this.calculateSecretHash(username);
      }

      const command = new ConfirmSignUpCommand(params);
      await this.client.send(command);

      return {
        success: true,
        message: "Email verificado exitosamente. Ahora puedes iniciar sesión.",
      };
    } catch (error: any) {
      logger.error("Error en confirmación:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Iniciar sesión con usuario y contraseña
   */
  async login(loginData: LoginDto): Promise<CognitoResponse> {
    try {
      const username = loginData.email.toLowerCase();
      const params: any = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.config.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: loginData.password,
        },
      };

      // Agregar SECRET_HASH si el client tiene secret configurado
      if (this.config.clientSecret) {
        params.AuthParameters.SECRET_HASH = this.calculateSecretHash(username);
      }

      const command = new InitiateAuthCommand(params);
      const response = await this.client.send(command);

      if (!response.AuthenticationResult) {
        return {
          success: false,
          message: "Error en autenticación",
        };
      }

      return {
        success: true,
        message: "Login exitoso",
        accessToken: response.AuthenticationResult.AccessToken || "",
        idToken: response.AuthenticationResult.IdToken || "",
        refreshToken: response.AuthenticationResult.RefreshToken || "",
        data: {
          expiresIn: response.AuthenticationResult.ExpiresIn,
          tokenType: response.AuthenticationResult.TokenType,
        },
      };
    } catch (error: any) {
      logger.error("Error en login:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Obtener información del usuario autenticado
   */
  async getUserInfo(accessToken: string): Promise<CognitoResponse> {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await this.client.send(command);

      // Parsear atributos de usuario
      const attributes: any = {};
      response.UserAttributes?.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      return {
        success: true,
        message: "Usuario obtenido exitosamente",
        data: {
          username: response.Username,
          attributes,
        },
      };
    } catch (error: any) {
      logger.error("Error al obtener usuario:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Cambiar contraseña de usuario autenticado
   */
  async changePassword(
    accessToken: string,
    oldPassword: string,
    newPassword: string
  ): Promise<CognitoResponse> {
    try {
      const command = new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword,
      });

      await this.client.send(command);

      return {
        success: true,
        message: "Contraseña actualizada exitosamente",
      };
    } catch (error: any) {
      logger.error("Error al cambiar contraseña:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Iniciar proceso de recuperación de contraseña
   */
  async forgotPassword(email: string): Promise<CognitoResponse> {
    try {
      const username = email.toLowerCase();
      const params: any = {
        ClientId: this.config.clientId,
        Username: username,
      };

      // Agregar SECRET_HASH si el client tiene secret configurado
      if (this.config.clientSecret) {
        params.SecretHash = this.calculateSecretHash(username);
      }

      const command = new ForgotPasswordCommand(params);
      await this.client.send(command);

      return {
        success: true,
        message:
          "Se ha enviado un código de verificación a tu email para restablecer la contraseña.",
      };
    } catch (error: any) {
      logger.error("Error en forgot password:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Confirmar nueva contraseña con código de verificación
   */
  async confirmForgotPassword(
    email: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<CognitoResponse> {
    try {
      const username = email.toLowerCase();
      const params: any = {
        ClientId: this.config.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
      };

      // Agregar SECRET_HASH si el client tiene secret configurado
      if (this.config.clientSecret) {
        params.SecretHash = this.calculateSecretHash(username);
      }

      const command = new ConfirmForgotPasswordCommand(params);
      await this.client.send(command);

      return {
        success: true,
        message: "Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.",
      };
    } catch (error: any) {
      logger.error("Error en confirm forgot password:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Cerrar sesión global (invalidar todos los tokens)
   */
  async globalSignOut(accessToken: string): Promise<CognitoResponse> {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      await this.client.send(command);

      return {
        success: true,
        message: "Sesión cerrada exitosamente en todos los dispositivos",
      };
    } catch (error: any) {
      logger.error("Error en global sign out:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Agregar usuario a un grupo (requiere permisos de admin)
   */
  async addUserToGroup(username: string, groupName: string): Promise<CognitoResponse> {
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
        GroupName: groupName,
      });

      await this.client.send(command);

      return {
        success: true,
        message: `Usuario agregado al grupo ${groupName} exitosamente`,
      };
    } catch (error: any) {
      logger.error("Error al agregar usuario a grupo:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Obtener información de usuario (admin)
   */
  async adminGetUser(username: string): Promise<CognitoResponse> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
      });

      const response = await this.client.send(command);

      // Parsear atributos
      const attributes: any = {};
      response.UserAttributes?.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      return {
        success: true,
        message: "Usuario obtenido exitosamente",
        data: {
          username: response.Username,
          userStatus: response.UserStatus,
          enabled: response.Enabled,
          attributes,
        },
      };
    } catch (error: any) {
      logger.error("Error al obtener usuario (admin):", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Actualizar atributos de usuario (admin)
   */
  async adminUpdateUserAttributes(
    username: string,
    attributes: { [key: string]: string }
  ): Promise<CognitoResponse> {
    try {
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      }));

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
        UserAttributes: userAttributes,
      });

      await this.client.send(command);

      return {
        success: true,
        message: "Atributos de usuario actualizados exitosamente",
      };
    } catch (error: any) {
      logger.error("Error al actualizar atributos:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Deshabilitar usuario (admin)
   */
  async adminDisableUser(username: string): Promise<CognitoResponse> {
    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
      });

      await this.client.send(command);

      return {
        success: true,
        message: "Usuario deshabilitado exitosamente",
      };
    } catch (error: any) {
      logger.error("Error al deshabilitar usuario:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Habilitar usuario (admin)
   */
  async adminEnableUser(username: string): Promise<CognitoResponse> {
    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: this.config.userPoolId,
        Username: username,
      });

      await this.client.send(command);

      return {
        success: true,
        message: "Usuario habilitado exitosamente",
      };
    } catch (error: any) {
      logger.error("Error al habilitar usuario:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Listar todos los usuarios del User Pool
   * Soporta paginación
   */
  async listUsers(limit: number = 60, paginationToken?: string): Promise<CognitoResponse> {
    try {
      const command = new ListUsersCommand({
        UserPoolId: this.config.userPoolId,
        Limit: limit,
        PaginationToken: paginationToken,
      });

      const response = await this.client.send(command);

      // Mapear usuarios a formato más amigable
      const users = (response.Users || []).map((user) => {
        const attributes = user.Attributes || [];
        const getAttributeValue = (name: string) => {
          const attr = attributes.find((a) => a.Name === name);
          return attr ? attr.Value : undefined;
        };

        return {
          username: user.Username,
          sub: getAttributeValue("sub"),
          email: getAttributeValue("email"),
          emailVerified: getAttributeValue("email_verified") === "true",
          firstName: getAttributeValue("given_name"),
          lastName: getAttributeValue("family_name"),
          userType: getAttributeValue("custom:user_type"),
          enabled: user.Enabled,
          userStatus: user.UserStatus,
          createdAt: user.UserCreateDate,
          lastModified: user.UserLastModifiedDate,
        };
      });

      return {
        success: true,
        message: "Usuarios obtenidos exitosamente",
        data: {
          users,
          paginationToken: response.PaginationToken,
          hasMore: !!response.PaginationToken,
        },
      };
    } catch (error) {
      logger.error("Error listando usuarios de Cognito:", error);
      return {
        success: false,
        message: this.parseErrorMessage(error),
      };
    }
  }

  /**
   * Parsear mensajes de error de Cognito
   */
  private parseErrorMessage(error: any): string {
    if (error.code) {
      switch (error.code) {
        case "UsernameExistsException":
          return "Ya existe un usuario con este email";
        case "UserNotFoundException":
          return "Usuario no encontrado";
        case "NotAuthorizedException":
          return "Credenciales inválidas";
        case "InvalidPasswordException":
          return "La contraseña no cumple con los requisitos de seguridad";
        case "CodeMismatchException":
          return "Código de verificación inválido";
        case "ExpiredCodeException":
          return "El código de verificación ha expirado";
        case "LimitExceededException":
          return "Has excedido el límite de intentos. Por favor intenta más tarde";
        case "TooManyRequestsException":
          return "Demasiadas solicitudes. Por favor intenta más tarde";
        case "InvalidParameterException":
          return "Parámetros inválidos";
        case "UserNotConfirmedException":
          return "Usuario no confirmado. Por favor verifica tu email";
        default:
          return error.message || "Error al procesar la solicitud";
      }
    }
    return error.message || "Error desconocido";
  }
}

