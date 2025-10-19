# Configuración de AWS Cognito

## 📋 Requisitos previos

1. Cuenta de AWS
2. User Pool y App Client creados en AWS Cognito
3. Grupos configurados en Cognito (admin, user)

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
cp .env.example .env
```

Completa las siguientes variables con tus credenciales de AWS Cognito:

```env
AWS_REGION=us-east-1                          # La región donde creaste el User Pool
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX     # ID del User Pool
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx  # ID del App Client
COGNITO_CLIENT_SECRET=xxxxxxxxxxxxxxxx        # Secret del App Client (opcional)
```

### 2. Configuración del User Pool en AWS

#### a) Crear User Pool

1. Ve a AWS Console → Cognito → User Pools
2. Click en "Create user pool"
3. Configura lo siguiente:

**Sign-in experience:**
- Provider types: Cognito user pool
- Sign-in options: Email

**Security requirements:**
- Password policy: Configura según tus necesidades
- MFA: Opcional (recomendado para producción)

**Sign-up experience:**
- Self-service sign-up: Enabled
- Required attributes:
  - email
  - given_name (nombre)
  - family_name (apellido)

**Message delivery:**
- Email provider: Amazon SES o Cognito (para desarrollo)

**App integration:**
- User pool name: `observatorio-inmobiliario-users`
- Domain: Configura un dominio personalizado o usa el de Cognito

#### b) Crear App Client

1. En tu User Pool, ve a "App integration" → "App clients"
2. Click en "Create app client"
3. Configura:
   - Name: `observatorio-api-client`
   - Client type: Confidential client (si necesitas client secret)
   - Authentication flows:
     - ✅ ALLOW_USER_PASSWORD_AUTH
     - ✅ ALLOW_REFRESH_TOKEN_AUTH
     - ✅ ALLOW_USER_SRP_AUTH
   - Generate client secret: Sí (opcional)

#### c) Crear Grupos (Roles)

1. En tu User Pool, ve a "Users and groups" → "Groups"
2. Crea los siguientes grupos:

**Grupo Admin:**
- Group name: `admin`
- Description: `Administradores del sistema`
- Precedence: `1`

**Grupo User (opcional):**
- Group name: `user`
- Description: `Usuarios regulares`
- Precedence: `2`

#### d) Configuración de AWS IAM (para operaciones admin)

Para que el backend pueda realizar operaciones administrativas (deshabilitar usuarios, actualizar atributos, etc.), necesitas crear un usuario IAM con permisos:

1. Ve a AWS IAM → Users → Create user
2. Crea un usuario para el backend: `observatorio-api-backend`
3. Asigna la política `AmazonCognitoPowerUser` o crea una política personalizada:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminDisableUser",
        "cognito-idp:AdminEnableUser",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:ListUsers",
        "cognito-idp:ListGroups"
      ],
      "Resource": "arn:aws:cognito-idp:REGION:ACCOUNT_ID:userpool/USER_POOL_ID"
    }
  ]
}
```

4. Genera Access Keys y agrégalas a tu `.env` (si es necesario):
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 🚀 Endpoints Disponibles

### Endpoints Públicos

#### Registro
```http
POST /users/register
Content-Type: application/json

{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "password": "Password123!"
}
```

#### Confirmar Registro
```http
POST /users/confirm
Content-Type: application/json

{
  "email": "juan@example.com",
  "confirmationCode": "123456"
}
```

#### Login
```http
POST /users/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "Password123!"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "accessToken": "eyJraWQiOiI...",
  "idToken": "eyJraWQiOiI...",
  "refreshToken": "eyJjdHkiOiI..."
}
```

#### Olvidé mi Contraseña
```http
POST /users/forgot-password
Content-Type: application/json

{
  "email": "juan@example.com"
}
```

#### Confirmar Nueva Contraseña
```http
POST /users/confirm-forgot-password
Content-Type: application/json

{
  "email": "juan@example.com",
  "confirmationCode": "123456",
  "newPassword": "NewPassword123!"
}
```

### Endpoints Autenticados

Incluye el token en el header: `Authorization: Bearer <accessToken>`

#### Obtener Perfil
```http
GET /users/profile
Authorization: Bearer eyJraWQiOiI...
```

#### Actualizar Perfil
```http
PUT /users/profile
Authorization: Bearer eyJraWQiOiI...
Content-Type: application/json

{
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "email": "juancarlos@example.com"
}
```

#### Cambiar Contraseña
```http
POST /users/change-password
Authorization: Bearer eyJraWQiOiI...
Content-Type: application/json

{
  "oldPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

#### Cerrar Sesión
```http
POST /users/logout
Authorization: Bearer eyJraWQiOiI...
```

#### Validar Token
```http
GET /users/validate-token
Authorization: Bearer eyJraWQiOiI...
```

### Endpoints de Admin

Requieren autenticación y que el usuario pertenezca al grupo `admin`.

#### Listar Usuarios
```http
GET /users
Authorization: Bearer eyJraWQiOiI...
```

#### Obtener Usuario
```http
GET /users/:username
Authorization: Bearer eyJraWQiOiI...
```

#### Actualizar Usuario
```http
PUT /users/:username
Authorization: Bearer eyJraWQiOiI...
Content-Type: application/json

{
  "firstName": "Nuevo Nombre",
  "email": "nuevo@example.com"
}
```

#### Deshabilitar Usuario
```http
DELETE /users/:username
Authorization: Bearer eyJraWQiOiI...
```

## 🔐 Gestión de Usuarios

### Crear primer usuario Admin

1. Registra un usuario mediante `/users/register`
2. Confirma el usuario mediante `/users/confirm`
3. Ve a AWS Cognito Console → Users and groups
4. Selecciona el usuario
5. Ve a "Group memberships" → "Add user to group"
6. Selecciona el grupo `admin`

### Tokens y Autenticación

AWS Cognito devuelve tres tipos de tokens:

1. **Access Token**: Para autenticar requests a la API (usar en Authorization header)
2. **ID Token**: Contiene información del usuario
3. **Refresh Token**: Para obtener nuevos access tokens sin re-autenticarse

Los tokens tienen expiración (configurable en Cognito, por defecto 1 hora para access token).

## 🔄 Migración de Usuarios Existentes

Si tienes usuarios existentes en tu base de datos local, tienes dos opciones:

### Opción 1: Migración Manual
1. Crear los usuarios en Cognito mediante la consola o API
2. Asignarlos a los grupos correspondientes
3. Enviar email de bienvenida con instrucción de restablecer contraseña

### Opción 2: Import de Usuarios (AWS CLI)
Usar AWS CLI para importar usuarios en batch. Necesitas un CSV con el formato:

```csv
name,given_name,family_name,middle_name,nickname,preferred_username,profile,picture,website,email,email_verified,gender,birthdate,zoneinfo,locale,phone_number,phone_number_verified,address,updated_at,cognito:mfa_enabled,cognito:username
```

## ⚠️ Notas Importantes

1. **Costos**: AWS Cognito tiene un tier gratuito de 50,000 MAU (Monthly Active Users)
2. **Email**: Para producción, configura Amazon SES para envío de emails
3. **MFA**: Considera habilitar MFA para usuarios admin
4. **Logging**: Habilita CloudWatch Logs para auditoría
5. **Backup**: Cognito no tiene backup automático, considera exportar usuarios periódicamente

## 🧪 Testing

Para testing local, puedes usar:

1. **Cognito Local**: https://github.com/jagregory/cognito-local
2. **Mocks**: Mockear el servicio de Cognito en tus tests

## 📚 Recursos

- [AWS Cognito Docs](https://docs.aws.amazon.com/cognito/)
- [Amazon Cognito Identity SDK](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)
- [AWS JWT Verify](https://github.com/awslabs/aws-jwt-verify)

