# 📬 Guía de Uso de Postman Collection - AWS Cognito

## 📦 Importar la Colección

1. Abre Postman
2. Click en **Import**
3. Selecciona el archivo `Observatorio_Inmobiliario_API.postman_collection.json`
4. La colección se importará con todos los endpoints actualizados

## 🔧 Configurar Variables de Entorno

### Opción 1: Usar Variables de Colección (Recomendado)

Las variables ya están configuradas en la colección:
- `base_url`: http://localhost:9000 (cambiar si usas otro puerto)
- `access_token`: Se setea automáticamente al hacer login
- `id_token`: Token de identidad de Cognito
- `refresh_token`: Token para renovar la sesión
- `user_sub`: ID único del usuario en Cognito
- `user_email`: Email del usuario
- `username`: Username para endpoints de admin

### Opción 2: Crear un Environment

1. En Postman, ve a **Environments**
2. Crea un nuevo environment: `Observatorio - Local`
3. Agrega las mismas variables de arriba
4. Selecciona el environment antes de hacer requests

## 🚀 Flujo de Trabajo Típico

### 1. Registro de Usuario Nuevo

**Request:** `POST /users/register`

```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan.perez@example.com",
  "password": "Password123!"
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente. Por favor verifica tu email.",
  "data": {
    "userSub": "abc123...",
    "userConfirmed": false
  }
}
```

**⚠️ Nota:** El usuario debe confirmar su email antes de poder hacer login.

### 2. Confirmar Registro

**Request:** `POST /users/confirm`

Revisa tu email y copia el código de 6 dígitos que recibiste.

```json
{
  "email": "juan.perez@example.com",
  "confirmationCode": "123456"
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Email verificado exitosamente. Ahora puedes iniciar sesión."
}
```

### 3. Login

**Request:** `POST /users/login`

```json
{
  "email": "juan.perez@example.com",
  "password": "Password123!"
}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "accessToken": "eyJraWQiOiI...",
  "idToken": "eyJraWQiOiI...",
  "refreshToken": "eyJjdHkiOiI...",
  "data": {
    "payload": {
      "sub": "abc123...",
      "email": "juan.perez@example.com",
      "cognito:groups": ["user"],
      ...
    }
  }
}
```

**✅ Automático:** Los tokens se guardan automáticamente en las variables de Postman gracias a los scripts de test.

### 4. Acceder a Endpoints Protegidos

Una vez que hayas hecho login, puedes acceder a cualquier endpoint protegido. Los headers de autorización ya están configurados para usar `{{access_token}}`.

**Ejemplo:** `GET /users/profile`

El header `Authorization: Bearer {{access_token}}` se agrega automáticamente.

## 📋 Estructura de la Colección

### 🔓 Authentication (Endpoints Públicos)

1. **Register User** - Registra un nuevo usuario
2. **Confirm Registration** - Confirma email con código
3. **Login User** - Inicia sesión (guarda tokens automáticamente)
4. **Forgot Password** - Solicita código para resetear contraseña
5. **Confirm Forgot Password** - Confirma nueva contraseña
6. **Validate Token** - Verifica si el token es válido
7. **Logout** - Cierra sesión en todos los dispositivos

### 👤 User Profile Management (Requieren Autenticación)

1. **Get Profile** - Obtiene perfil del usuario autenticado
2. **Update Profile** - Actualiza nombre, apellido o email
3. **Change Password** - Cambia la contraseña (requiere contraseña actual)

### 👨‍💼 User Administration (Requieren Grupo Admin)

1. **Get All Users (Admin)** - Lista todos los usuarios
2. **Get User By Username (Admin)** - Obtiene usuario específico
3. **Update User By Username (Admin)** - Actualiza atributos de usuario
4. **Disable User (Admin)** - Deshabilita un usuario

### 🏠 Rent Management

1. **Rent Index** - Endpoint de prueba
2. **Predict Rent** - Predice precio de renta

## 🔐 Tokens de AWS Cognito

### Access Token
- **Uso:** Autenticación en la API
- **Duración:** 1 hora (configurable en Cognito)
- **Se envía en:** Header `Authorization: Bearer <token>`
- **Variable:** `{{access_token}}`

### ID Token
- **Uso:** Contiene información del usuario (claims)
- **Duración:** 1 hora
- **Variable:** `{{id_token}}`

### Refresh Token
- **Uso:** Renovar access tokens sin re-autenticarse
- **Duración:** 30 días (configurable)
- **Variable:** `{{refresh_token}}`

## 🧪 Scripts de Test Automáticos

Cada request tiene scripts que:

1. **Validan el status code**
2. **Verifican la estructura de la respuesta**
3. **Guardan tokens/variables automáticamente**

### Ejemplo de Script (Login):

```javascript
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.accessToken) {
        pm.environment.set('access_token', responseJson.accessToken);
        pm.environment.set('id_token', responseJson.idToken);
        pm.environment.set('refresh_token', responseJson.refreshToken);
    }
}
```

## 🔄 Renovar Token Expirado

Si recibes error `401 - Token expirado`:

1. Haz login nuevamente: `POST /users/login`
2. Los tokens se actualizarán automáticamente
3. Continúa usando los endpoints protegidos

**Nota:** En producción, implementa refresh token automático en tu frontend.

## 👨‍💼 Acceso de Administrador

### Crear el Primer Admin

1. Registra un usuario normalmente
2. Confirma el email
3. Ve a AWS Console → Cognito → User Pools → Tu pool
4. Selecciona el usuario en "Users and groups"
5. Ve a "Group memberships" → "Add user to group"
6. Selecciona el grupo `admin`

### Usar Endpoints de Admin

Una vez que tu usuario esté en el grupo `admin`:

1. Haz login como ese usuario
2. Accede a cualquier endpoint de la carpeta "User Administration"
3. Para obtener/actualizar otros usuarios, usa su **username** (no email)

**Ejemplo:**
```
GET {{base_url}}/users/juan.perez@example.com
```

## 🆘 Troubleshooting

### Error: "Token de acceso requerido"
- Verifica que hayas hecho login
- Verifica que la variable `access_token` tenga un valor
- Asegúrate de que el header Authorization esté presente

### Error: "Token inválido" o "Token expirado"
- Haz login nuevamente
- Los access tokens expiran después de 1 hora
- Usa refresh token (implementar en frontend)

### Error: "Usuario no confirmado"
- Debes confirmar el email después del registro
- Usa el endpoint `POST /users/confirm` con el código recibido

### Error: "No tienes permisos para acceder a este recurso"
- El endpoint requiere grupo `admin`
- Verifica que tu usuario esté en el grupo admin en Cognito

### Error: "Credenciales inválidas"
- Verifica email y contraseña
- Asegúrate de que el usuario esté confirmado
- Verifica que el usuario no esté deshabilitado en Cognito

## 📊 Ejemplos de Requests

### Recuperar Contraseña

**Paso 1: Solicitar código**
```http
POST /users/forgot-password
{
  "email": "usuario@example.com"
}
```

**Paso 2: Confirmar nueva contraseña**
```http
POST /users/confirm-forgot-password
{
  "email": "usuario@example.com",
  "confirmationCode": "123456",
  "newPassword": "NuevaPassword123!"
}
```

### Actualizar Perfil

```http
PUT /users/profile
Authorization: Bearer {{access_token}}

{
  "firstName": "Juan Carlos",
  "lastName": "Pérez García",
  "email": "nuevo@example.com"
}
```

### Admin: Deshabilitar Usuario

```http
DELETE /users/otro.usuario@example.com
Authorization: Bearer {{access_token}}
```

(Requiere que el usuario autenticado esté en el grupo `admin`)

## 🎯 Tips y Best Practices

1. **Usa Environments:** Crea environments para Local, Dev, Staging, Production
2. **Scripts de Test:** Los scripts automáticos te ahorran copiar/pegar tokens
3. **Organización:** Los requests están organizados por carpetas lógicas
4. **Variables:** Aprovecha las variables para no hardcodear valores
5. **Documentación:** Cada request tiene una descripción de lo que hace

## 📚 Recursos Adicionales

- [Postman Documentation](https://learning.postman.com/docs/)
- [AWS Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- Ver `COGNITO_SETUP.md` para configuración de AWS
- Ver `MIGRACION_COGNITO.md` para guía completa de migración

## 🔗 Links Útiles

- **API Base URL (Local):** http://localhost:9000
- **AWS Cognito Console:** https://console.aws.amazon.com/cognito/
- **Postman Learning Center:** https://learning.postman.com/

---

¿Preguntas? Revisa la documentación en `COGNITO_SETUP.md` y `MIGRACION_COGNITO.md`

