# 📮 Actualización de Colección Postman

## Resumen

Se ha actualizado la colección de Postman para reflejar correctamente que **toda la gestión de usuarios se realiza mediante AWS Cognito**, sin base de datos local de usuarios.

---

## Cambios Principales

### ✅ Endpoint "Get All Users (Admin)" Actualizado

**ANTES:**
- URL simple: `GET /users`
- Sin query params
- Descripción: "Lista desde base de datos local" ❌

**DESPUÉS:**
- URL con query params: `GET /users?limit=60&paginationToken=...`
- Soporta paginación
- Descripción actualizada: "Lista desde AWS Cognito User Pool" ✅

---

## Nuevos Endpoints

### 🆕 "Get All Users - Next Page (Admin)"

**Propósito:** Ejemplo de cómo usar paginación en Cognito

**Request:**
```http
GET /users?limit=60&paginationToken={{pagination_token}}
Authorization: Bearer {{access_token}}
```

**Uso:**
1. Ejecutar "Get All Users (Admin)" primero
2. Si `hasMore: true`, el `paginationToken` se guarda automáticamente
3. Ejecutar "Get All Users - Next Page" para obtener la siguiente página

---

## Tests Actualizados

### Endpoint: "Get All Users (Admin)"

**Nuevos tests agregados:**

```javascript
// 1. Guardar paginationToken automáticamente
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.paginationToken) {
        pm.environment.set('pagination_token', responseJson.paginationToken);
    } else {
        pm.environment.unset('pagination_token');
    }
}

// 2. Verificar atributos de Cognito en usuarios
pm.test('Users have Cognito attributes', function () {
    const responseJson = pm.response.json();
    if (responseJson.users.length > 0) {
        const user = responseJson.users[0];
        pm.expect(user.username).to.not.be.undefined;
        pm.expect(user.sub).to.not.be.undefined;
        pm.expect(user.email).to.not.be.undefined;
        pm.expect(user.enabled).to.be.a('boolean');
        pm.expect(user.userStatus).to.not.be.undefined;
    }
});

// 3. Verificar información de paginación
pm.test('Response includes pagination info', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson.hasMore).to.be.a('boolean');
});
```

---

## Query Parameters

### GET /users

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `limit` | number | No | 60 | Número de usuarios por página (máximo: 60) |
| `paginationToken` | string | No | - | Token para obtener la siguiente página |

**Ejemplo sin paginación:**
```
GET /users?limit=60
```

**Ejemplo con paginación:**
```
GET /users?limit=60&paginationToken=AQIC5...XYZ
```

---

## Respuesta Actualizada

### Estructura de Respuesta

```json
{
  "success": true,
  "message": "Usuarios obtenidos exitosamente",
  "users": [
    {
      "username": "user@example.com",
      "sub": "12345678-1234-1234-1234-123456789abc",
      "email": "user@example.com",
      "emailVerified": true,
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Propietario",
      "enabled": true,
      "userStatus": "CONFIRMED",
      "createdAt": "2025-10-25T14:30:00.000Z",
      "lastModified": "2025-10-25T14:30:00.000Z"
    }
    // ... más usuarios (hasta 60)
  ],
  "total": 60,
  "paginationToken": "AQIC5wM2LY44FmsiQXJpYXNAc2Vuc29yczQuY29tIg",  // null si no hay más páginas
  "hasMore": true  // false si es la última página
}
```

### Campos Nuevos de Usuario (desde Cognito)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `username` | string | Username en Cognito (generalmente el email) |
| `sub` | string | ID único del usuario en Cognito (UUID) |
| `emailVerified` | boolean | Si el email ha sido verificado |
| `enabled` | boolean | Si el usuario está habilitado |
| `userStatus` | string | Estado: CONFIRMED, UNCONFIRMED, FORCE_CHANGE_PASSWORD, etc. |
| `createdAt` | Date | Fecha de creación en Cognito |
| `lastModified` | Date | Última modificación en Cognito |

---

## Variables de Entorno Nuevas

### Variable: `pagination_token`

**Descripción:** Token de paginación para Cognito User Pool

**Uso:**
- Se guarda automáticamente al ejecutar "Get All Users (Admin)"
- Se usa en "Get All Users - Next Page (Admin)"
- Se limpia automáticamente cuando no hay más páginas

**Ubicación en Postman:**
```
Variables → pagination_token
```

---

## Descripción General Actualizada

### Info de la Colección

**Nueva descripción incluye:**

```
Colección completa para la API del Observatorio Inmobiliario.

**Autenticación:** AWS Cognito User Pool (todos los usuarios se gestionan en Cognito)
**Predicciones:** AWS Lambda para ML + S3 para imágenes/métricas + Overpass API para lugares cercanos
**Base de datos:** PostgreSQL para historial de predicciones (usa cognitoSub como referencia)

**Notas importantes:**
- No hay entidad User local - toda la gestión de usuarios se hace en Cognito
- Los endpoints de admin requieren pertenecer al grupo 'admin' en Cognito
- El listado de usuarios soporta paginación (limit y paginationToken)
- Las predicciones se guardan automáticamente si el usuario está autenticado
```

### Carpeta "User Administration"

**Nueva descripción:**
```
Endpoints de administración de usuarios (requieren grupo 'admin' de Cognito).

**Importante:** Todos los endpoints listan, obtienen y modifican usuarios directamente 
en AWS Cognito User Pool. No hay base de datos local de usuarios.

**Paginación:** El endpoint GET /users soporta paginación con query params 'limit' 
(max 60) y 'paginationToken' (obtenido de respuesta anterior).
```

---

## Flujo de Uso: Paginación

### Paso 1: Obtener primera página

```http
GET /users?limit=60
Authorization: Bearer {{access_token}}
```

**Respuesta:**
```json
{
  "success": true,
  "users": [ /* 60 usuarios */ ],
  "total": 60,
  "paginationToken": "AQIC5wM2LY44FmsiQXJpYXN...",
  "hasMore": true
}
```

✅ El test automáticamente guarda `paginationToken` en variable de entorno

---

### Paso 2: Obtener siguiente página

```http
GET /users?limit=60&paginationToken={{pagination_token}}
Authorization: Bearer {{access_token}}
```

**Respuesta:**
```json
{
  "success": true,
  "users": [ /* siguiente conjunto de hasta 60 usuarios */ ],
  "total": 45,
  "paginationToken": "BQJD6xN3MZ55GntjRks...",  // o null si es la última página
  "hasMore": true  // o false si es la última página
}
```

---

### Paso 3: Continuar hasta llegar al final

Cuando `hasMore: false` y `paginationToken: null`, ya no hay más páginas.

---

## Endpoints sin Cambios

Los siguientes endpoints **NO** requieren actualización ya que siempre usaron Cognito:

✅ **Authentication:**
- Register User
- Confirm Registration
- Login User
- Forgot Password
- Confirm Forgot Password
- Validate Token
- Logout

✅ **User Profile Management:**
- Get Profile
- Update Profile
- Change Password

✅ **User Administration (otros endpoints):**
- Get User By Username (Admin)
- Update User By Username (Admin)
- Disable User (Admin)

✅ **Prediction History:**
- Todos los endpoints (sin cambios)

✅ **Rent Management:**
- Todos los endpoints (sin cambios)

---

## Verificación

### Checklist de Actualización

- [x] ✅ Endpoint "Get All Users" actualizado con query params
- [x] ✅ Nuevo endpoint "Get All Users - Next Page" agregado
- [x] ✅ Tests actualizados para verificar atributos de Cognito
- [x] ✅ Script de test para guardar `paginationToken` automáticamente
- [x] ✅ Variable `pagination_token` agregada
- [x] ✅ Descripción general de la colección actualizada
- [x] ✅ Descripción de carpeta "User Administration" actualizada
- [x] ✅ Documentación de campos de respuesta actualizada

---

## Testing Recomendado

### Escenario 1: Usuario Admin Lista Usuarios

1. **Login** como admin
   - Ejecutar: "Login User"
   - Verificar: `access_token` guardado

2. **Obtener primera página**
   - Ejecutar: "Get All Users (Admin)"
   - Verificar: Respuesta con 60 usuarios (si hay suficientes)
   - Verificar: `pagination_token` guardado automáticamente si `hasMore: true`

3. **Obtener siguiente página** (si `hasMore: true`)
   - Ejecutar: "Get All Users - Next Page (Admin)"
   - Verificar: Respuesta con siguiente conjunto de usuarios
   - Verificar: Usuarios diferentes a los de la primera página

### Escenario 2: Usuario No Admin Intenta Listar

1. **Login** como usuario regular
2. **Intentar listar**
   - Ejecutar: "Get All Users (Admin)"
   - Verificar: Error 403 Forbidden (no pertenece al grupo admin)

---

## Beneficios de la Actualización

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| **Fuente de datos** | "Base de datos local" ❌ | AWS Cognito ✅ |
| **Paginación** | No documentada | Completamente documentada ✅ |
| **Tests** | Básicos | Verifican atributos de Cognito ✅ |
| **Automatización** | Manual | Auto-guarda paginationToken ✅ |
| **Ejemplos** | 1 endpoint | 2 endpoints (con/sin paginación) ✅ |
| **Documentación** | Desactualizada | Actualizada y precisa ✅ |

---

## Próximos Pasos (Opcional)

### Mejoras Futuras para Postman

1. **Environment Examples:**
   - Crear environment de ejemplo con valores de prueba
   - Incluir tokens de ejemplo (expirados) para referencia

2. **Response Examples:**
   - Agregar ejemplos de respuestas exitosas y de error
   - Documentar todos los códigos de estado posibles

3. **Pre-request Scripts:**
   - Validar que access_token existe antes de requests autenticados
   - Mostrar mensaje amigable si falta el token

4. **Collection Runner:**
   - Crear test suite para ejecutar todos los endpoints en orden
   - Validar flujo completo: Register → Confirm → Login → List Users

---

## Conclusión

✅ **La colección de Postman está actualizada y refleja correctamente:**
- Eliminación de entidad User local
- Gestión 100% con AWS Cognito
- Soporte completo de paginación
- Tests mejorados y automatización

✅ **Documentación clara sobre:**
- Cómo usar paginación
- Estructura de respuestas de Cognito
- Campos nuevos y sus tipos
- Flujo de uso recomendado

🎉 **¡Colección lista para usar con la nueva arquitectura!**
