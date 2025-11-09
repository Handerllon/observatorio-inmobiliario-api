# 🔧 Fix: Email Vacío en Logs de Predicciones

## Problema Reportado

Los endpoints de `RentPredictionRouter` estaban logueando el email del usuario, pero el valor aparecía vacío en los logs.

### Síntoma
```typescript
logger.info(`📋 Usuario ${user.email} obteniendo historial de predicciones`);
// Output: [ ... - INFO ] 📋 Usuario  obteniendo historial de predicciones
//                                           ^^^ VACÍO
```

## Causa Raíz

Los endpoints de predicciones estaban usando el middleware `authenticate` (Access Token), pero intentando acceder al campo `email` del usuario, el cual **solo está disponible en el ID Token**.

### Endpoints Afectados
- `GET /predictions` - Historial de predicciones
- `GET /predictions/recent` - Predicciones recientes
- `GET /predictions/statistics` - Estadísticas del usuario
- `GET /predictions/favorites` - Predicciones favoritas
- `GET /predictions/:id` - Predicción por ID
- `POST /predictions/:id/favorite` - Marcar/desmarcar favorito
- `PUT /predictions/:id/notes` - Actualizar notas
- `DELETE /predictions/:id` - Eliminar predicción
- `POST /rent/predict` - Crear predicción (opcional con autenticación)

## Solución Implementada

### 1. Nuevo Middleware: `optionalAuthenticateWithProfile`

Se creó un nuevo middleware para autenticación opcional que usa **ID Token** en lugar de Access Token:

```typescript
static async optionalAuthenticateWithProfile(
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
    
    // Verificar el ID Token con AWS Cognito
    const verifier = CognitoMiddleware.initIdTokenVerifier();
    const payload = await verifier.verify(token);
    
    const user: CognitoUser = {
      sub: payload.sub,
      email: payload.email || "",  // ✅ AHORA DISPONIBLE
      email_verified: payload.email_verified || false,
      given_name: payload.given_name,
      family_name: payload.family_name,
      groups: payload["cognito:groups"] || [],
      username: payload.username || payload["cognito:username"],
      user_type: payload["custom:user_type"] as "Propietario" | "Agente" | "Inquilino" | undefined,
    };
    
    req.user = user;
    req.cognitoPayload = payload;
  } catch (error) {
    // Si hay error, simplemente continuar sin autenticación
    logger.debug("Token inválido en autenticación opcional con perfil:", error);
  }
  
  next();
}
```

### 2. Actualización de Routers

#### RentPredictionRouter
Todos los endpoints ahora usan `authenticateWithProfile` (ID Token obligatorio):

```typescript
public routes(router: Router): void {
  // Todas las rutas requieren autenticación con ID Token
  // Usamos authenticateWithProfile para tener acceso al email del usuario en los logs
  
  router.get(
    `${this.prefix}`,
    CognitoMiddleware.authenticateWithProfile,  // ✅ ID Token
    this.controller.getUserPredictions
  );
  
  router.get(
    `${this.prefix}/recent`,
    CognitoMiddleware.authenticateWithProfile,  // ✅ ID Token
    this.controller.getRecentPredictions
  );
  
  // ... otros endpoints
}
```

#### RentRouter
El endpoint de predicción usa `optionalAuthenticateWithProfile` (ID Token opcional):

```typescript
public routes(router: Router): void {
  // Predict ahora usa autenticación opcional con perfil completo
  // Esto permite guardar el email del usuario en los logs y en la base de datos
  // Si no hay token o es inválido, permite acceso anónimo
  router.post(
    `${this.prefix}/predict`,
    CognitoMiddleware.optionalAuthenticateWithProfile,  // ✅ ID Token opcional
    this.controller.predict
  );
}
```

### 3. Actualización de Postman Collection

Todos los endpoints de predicciones ahora usan `{{id_token}}` en lugar de `{{access_token}}`:

**Antes:**
```json
{
  "header": [
    {
      "key": "Authorization",
      "value": "Bearer {{access_token}}"  // ❌ Access Token
    }
  ]
}
```

**Después:**
```json
{
  "header": [
    {
      "key": "Authorization",
      "value": "Bearer {{id_token}}"  // ✅ ID Token
    }
  ],
  "description": "... **Requiere ID Token** para acceso al email del usuario."
}
```

### 4. Actualización de Documentación

Se actualizó `TOKEN_TYPES_GUIDE.md` para incluir:
- Descripción del nuevo middleware `optionalAuthenticateWithProfile`
- Lista completa de endpoints que requieren ID Token
- Diferencia entre autenticación obligatoria y opcional

## Resultado

### Antes
```
[ 2025-10-27 15:30:45 - INFO ] 📋 Usuario  obteniendo historial de predicciones
                                           ^^^ VACÍO
```

### Después
```
[ 2025-10-27 15:30:45 - INFO ] 📋 Usuario usuario@example.com obteniendo historial de predicciones
                                           ^^^^^^^^^^^^^^^^^^^ ✅ PRESENTE
```

## Archivos Modificados

1. **`src/middleware/cognito.middleware.ts`**
   - Añadido `optionalAuthenticateWithProfile` middleware

2. **`src/routes/RentPredictionRouter.ts`**
   - Cambiado de `authenticate` a `authenticateWithProfile` en todos los endpoints

3. **`src/routes/RentRouter.ts`**
   - Cambiado de `optionalAuthenticate` a `optionalAuthenticateWithProfile` en `/rent/predict`

4. **`Observatorio_Inmobiliario_API.postman_collection.json`**
   - Actualizado todos los endpoints de predicciones para usar `{{id_token}}`
   - Actualizado endpoint `/rent/predict` para usar `{{id_token}}`
   - Añadidas descripciones indicando el uso de ID Token

5. **`READMEs/TOKEN_TYPES_GUIDE.md`**
   - Añadida documentación del nuevo middleware opcional con perfil
   - Actualizada lista de endpoints que usan cada middleware

## Resumen de Middlewares Disponibles

| Middleware | Token | Obligatorio | Contiene Email | Uso Principal |
|------------|-------|-------------|----------------|---------------|
| `authenticate` | Access | Sí | ❌ No | Endpoints con verificación de roles |
| `authenticateWithProfile` | ID | Sí | ✅ Sí | Endpoints de perfil y predicciones |
| `optionalAuthenticate` | Access | No | ❌ No | Endpoints públicos con info básica |
| `optionalAuthenticateWithProfile` | ID | No | ✅ Sí | Endpoints públicos con info completa |

## Notas Importantes

- Los usuarios ahora deben usar el **ID Token** (no Access Token) para todos los endpoints de predicciones
- El ID Token se obtiene automáticamente en el login y se guarda en `{{id_token}}`
- El endpoint `/rent/predict` permite uso anónimo, pero si se autentica con ID Token, logueará y guardará el email
- Todos los logs ahora mostrarán correctamente el email del usuario autenticado

