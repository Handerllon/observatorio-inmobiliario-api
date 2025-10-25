# 🔐 Guía de Tipos de Tokens en Cognito

## Problema Resuelto

### Síntoma Original
El endpoint `GET /users/profile` devolvía información incompleta:
```json
{
    "success": true,
    "message": "Perfil obtenido exitosamente",
    "user": {
        "id": "513bc530-7091-7067-d417-30a40fa11245",
        "email": "",  // ❌ VACÍO
        "username": "513bc530-7091-7067-d417-30a40fa11245",
        "groups": [],
        "emailVerified": false
        // ❌ Faltaban: firstName, lastName, userType
    }
}
```

### Causa Raíz
AWS Cognito emite **dos tipos de tokens** después del login:
1. **Access Token** - Para autorización (grupos, permisos)
2. **ID Token** - Para información del perfil del usuario

El middleware estaba usando **Access Token** para todos los endpoints, pero los atributos del usuario (email, firstName, lastName, userType) están en el **ID Token**.

---

## Solución Implementada

### Dos Middleware Diferentes

#### 1. `authenticate` (Access Token)
**Uso:** Endpoints que necesitan **autorización** (verificar grupos/roles)

**Contiene:**
- `sub` (ID del usuario)
- `username`
- `cognito:groups` (roles: admin, user, etc.)
- `scope` (permisos)

**Endpoints que lo usan:**
- Endpoints administrativos (requieren verificar grupo admin)
- Cambio de contraseña
- Logout
- Listado de usuarios

**Ejemplo:**
```typescript
router.get(
  `/users`, 
  CognitoMiddleware.authenticate,  // ✅ Access Token
  CognitoMiddleware.authorize(["admin"]), 
  controller.getAllUsers
);
```

#### 2. `authenticateWithProfile` (ID Token) - **NUEVO**
**Uso:** Endpoints que necesitan **información completa del perfil**

**Contiene:**
- `sub` (ID del usuario)
- `email`
- `email_verified`
- `given_name` (firstName)
- `family_name` (lastName)
- `custom:user_type` (Propietario/Agente/Inquilino)
- `cognito:groups`
- `cognito:username`

**Endpoints que lo usan:**
- **GET /users/profile** ✅
- **PUT /users/profile** ✅
- **GET /users/validate-token** ✅

**Ejemplo:**
```typescript
router.get(
  `/users/profile`, 
  CognitoMiddleware.authenticateWithProfile,  // ✅ ID Token
  controller.getProfile
);
```

---

## Respuesta Corregida

### Ahora GET /users/profile devuelve:

```json
{
    "success": true,
    "message": "Perfil obtenido exitosamente",
    "user": {
        "id": "513bc530-7091-7067-d417-30a40fa11245",
        "email": "usuario@example.com",  // ✅ PRESENTE
        "firstName": "Juan",  // ✅ PRESENTE
        "lastName": "Pérez",  // ✅ PRESENTE
        "username": "usuario@example.com",
        "groups": ["admin"],
        "emailVerified": true,
        "userType": "Propietario"  // ✅ PRESENTE
    }
}
```

---

## Cómo Usar en Postman

### Paso 1: Login
```http
POST /users/login
Content-Type: application/json

{
    "email": "usuario@example.com",
    "password": "Password123!"
}
```

**Respuesta:**
```json
{
    "success": true,
    "message": "Login exitoso",
    "accessToken": "eyJraWQ...",  // ⬅️ Access Token
    "idToken": "eyJraWQ...",       // ⬅️ ID Token
    "refreshToken": "eyJjdHki..."
}
```

### Paso 2: Guardar Tokens
El script de test en Postman automáticamente guarda:
- `access_token` → Para endpoints administrativos
- `id_token` → Para endpoints de perfil

### Paso 3: Usar el Token Correcto

#### Para Perfil (GET /users/profile):
```http
GET /users/profile
Authorization: Bearer {{id_token}}  ⬅️ Usar ID Token
```

#### Para Admin (GET /users):
```http
GET /users
Authorization: Bearer {{access_token}}  ⬅️ Usar Access Token
```

---

## Tabla de Referencia: ¿Qué Token Usar?

| Endpoint | Método | Token Requerido | Razón |
|----------|--------|----------------|-------|
| `/users/register` | POST | Ninguno | Público |
| `/users/login` | POST | Ninguno | Público |
| `/users/profile` | GET | **ID Token** 🆔 | Necesita atributos del usuario |
| `/users/profile` | PUT | **ID Token** 🆔 | Necesita atributos del usuario |
| `/users/validate-token` | GET | **ID Token** 🆔 | Valida y retorna perfil |
| `/users/change-password` | POST | Access Token | Solo necesita autenticación |
| `/users/logout` | POST | Access Token | Solo necesita autenticación |
| `/users` (admin) | GET | Access Token | Necesita verificar grupo admin |
| `/users/:id` (admin) | GET | Access Token | Necesita verificar grupo admin |
| `/users/:id` (admin) | PUT | Access Token | Necesita verificar grupo admin |
| `/users/:id` (admin) | DELETE | Access Token | Necesita verificar grupo admin |
| `/rent/predict` | POST | Access Token | Opcional, para guardar historial |
| `/predictions` | GET | Access Token | Necesita autenticación |
| `/predictions/:id` | GET | Access Token | Necesita autenticación |

---

## Diferencias Entre Access Token e ID Token

### Access Token (JWT)

**Propósito:** Autorización y permisos

**Claims comunes:**
```json
{
  "sub": "12345678-1234-1234-1234-123456789abc",
  "username": "usuario@example.com",
  "cognito:groups": ["admin", "users"],
  "token_use": "access",
  "scope": "aws.cognito.signin.user.admin",
  "auth_time": 1698765432,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/...",
  "exp": 1698769032,
  "iat": 1698765432,
  "jti": "abcdef12-3456-7890-abcd-ef1234567890",
  "client_id": "5d61k1ijkp35mb8pbg2kcc8280"
}
```

**NO contiene:**
- ❌ Email
- ❌ Nombre completo
- ❌ Atributos personalizados

---

### ID Token (JWT)

**Propósito:** Información del perfil del usuario

**Claims comunes:**
```json
{
  "sub": "12345678-1234-1234-1234-123456789abc",
  "email": "usuario@example.com",
  "email_verified": true,
  "given_name": "Juan",
  "family_name": "Pérez",
  "custom:user_type": "Propietario",
  "cognito:groups": ["admin", "users"],
  "cognito:username": "usuario@example.com",
  "token_use": "id",
  "auth_time": 1698765432,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/...",
  "exp": 1698769032,
  "iat": 1698765432,
  "aud": "5d61k1ijkp35mb8pbg2kcc8280"
}
```

**SÍ contiene:**
- ✅ Email
- ✅ Email verificado
- ✅ Nombre (`given_name`)
- ✅ Apellido (`family_name`)
- ✅ Atributos personalizados (`custom:user_type`)
- ✅ Grupos (`cognito:groups`)

---

## Actualización de Postman Collection

### Variables Actualizadas

| Variable | Uso | Se guarda automáticamente |
|----------|-----|---------------------------|
| `access_token` | Endpoints administrativos y autenticación general | ✅ Sí (desde login) |
| `id_token` | Endpoints de perfil de usuario | ✅ Sí (desde login) |
| `refresh_token` | Renovar tokens | ✅ Sí (desde login) |

### Tests Actualizados en Login

```javascript
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.accessToken) {
        pm.environment.set('access_token', responseJson.accessToken);
        pm.environment.set('id_token', responseJson.idToken);  // ⬅️ NUEVO
        pm.environment.set('refresh_token', responseJson.refreshToken);
    }
}
```

### Endpoints de Perfil Actualizados

**GET /users/profile:**
```javascript
// Header actualizado
{
    "key": "Authorization",
    "value": "Bearer {{id_token}}",  // ⬅️ Cambio de access_token a id_token
    "type": "text"
}
```

**PUT /users/profile:**
```javascript
// Header actualizado
{
    "key": "Authorization",
    "value": "Bearer {{id_token}}",  // ⬅️ Cambio de access_token a id_token
    "type": "text"
}
```

**GET /users/validate-token:**
```javascript
// Header actualizado
{
    "key": "Authorization",
    "value": "Bearer {{id_token}}",  // ⬅️ Cambio de access_token a id_token
    "type": "text"
}
```

---

## Debugging: Verificar Contenido de Token

### Opción 1: jwt.io

1. Ve a https://jwt.io
2. Pega tu token (Access o ID)
3. Revisa el payload decodificado
4. Verifica el claim `token_use`:
   - `"token_use": "access"` → Access Token
   - `"token_use": "id"` → ID Token

### Opción 2: Console en Postman

```javascript
// En Tests o Pre-request Script
const token = pm.environment.get('id_token');
const base64Payload = token.split('.')[1];
const payload = JSON.parse(atob(base64Payload));
console.log('Token payload:', payload);
console.log('Token type:', payload.token_use);
```

---

## Código Implementado

### Middleware: cognito.middleware.ts

```typescript
export class CognitoMiddleware {
  private static accessTokenVerifier: any;
  private static idTokenVerifier: any;

  // Verificador para Access Tokens
  private static initAccessTokenVerifier() {
    // ... configuración ...
    CognitoMiddleware.accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: userPoolId,
      tokenUse: "access",  // ⬅️ Access Token
      clientId: clientId,
    });
  }

  // Verificador para ID Tokens
  private static initIdTokenVerifier() {
    // ... configuración ...
    CognitoMiddleware.idTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: userPoolId,
      tokenUse: "id",  // ⬅️ ID Token
      clientId: clientId,
    });
  }

  // Middleware para autorización (Access Token)
  static async authenticate(req, res, next) {
    const verifier = CognitoMiddleware.initAccessTokenVerifier();
    const payload = await verifier.verify(token);
    // ... extraer datos básicos ...
  }

  // Middleware para perfil completo (ID Token)
  static async authenticateWithProfile(req, res, next) {
    const verifier = CognitoMiddleware.initIdTokenVerifier();
    const payload = await verifier.verify(token);
    // ... extraer todos los atributos del usuario ...
  }
}
```

### Router: UserRouter.ts

```typescript
// Endpoints de perfil usan ID Token
router.get(
  `/users/profile`, 
  CognitoMiddleware.authenticateWithProfile,  // ⬅️ ID Token
  controller.getProfile
);

// Endpoints administrativos usan Access Token
router.get(
  `/users`, 
  CognitoMiddleware.authenticate,  // ⬅️ Access Token
  CognitoMiddleware.authorize(["admin"]), 
  controller.getAllUsers
);
```

---

## Mejores Prácticas

### ✅ DO

1. **Usar ID Token para endpoints de perfil**
   ```javascript
   Authorization: Bearer {{id_token}}
   ```

2. **Usar Access Token para endpoints administrativos**
   ```javascript
   Authorization: Bearer {{access_token}}
   ```

3. **Guardar ambos tokens después del login**
   ```javascript
   pm.environment.set('access_token', responseJson.accessToken);
   pm.environment.set('id_token', responseJson.idToken);
   ```

4. **Renovar tokens cuando expiren**
   - Ambos tokens tienen ~1 hora de validez
   - Usar refresh token para obtener nuevos tokens

### ❌ DON'T

1. **No usar Access Token para perfil**
   ```javascript
   // ❌ MAL - No tiene atributos del usuario
   GET /users/profile
   Authorization: Bearer {{access_token}}
   ```

2. **No exponer tokens en logs**
   ```javascript
   // ❌ MAL
   console.log('Token:', token);
   
   // ✅ BIEN
   logger.debug('Token recibido (oculto por seguridad)');
   ```

3. **No almacenar tokens en código**
   ```javascript
   // ❌ MAL
   const token = "eyJraWQ...";
   
   // ✅ BIEN
   const token = pm.environment.get('id_token');
   ```

---

## Testing

### Test 1: Verificar Perfil Completo

```http
GET /users/profile
Authorization: Bearer {{id_token}}
```

**Resultado esperado:**
```json
{
    "user": {
        "email": "usuario@example.com",  // ✅
        "firstName": "Juan",  // ✅
        "lastName": "Pérez",  // ✅
        "userType": "Propietario"  // ✅
    }
}
```

### Test 2: Verificar Autorización Admin

```http
GET /users
Authorization: Bearer {{access_token}}
```

**Resultado esperado:**
- Si es admin: `200 OK` con lista de usuarios
- Si no es admin: `403 Forbidden`

---

## Conclusión

✅ **Problema resuelto:**
- Endpoints de perfil ahora usan **ID Token**
- Atributos del usuario (`email`, `firstName`, `lastName`, `userType`) ahora se devuelven correctamente

✅ **Arquitectura mejorada:**
- Separación clara entre autorización (Access Token) y perfil (ID Token)
- Middleware especializado para cada caso de uso

✅ **Mejor seguridad:**
- Cada endpoint usa el token apropiado
- Verificación específica según el tipo de token

🎉 **GET /users/profile ahora devuelve toda la información del usuario!**

