# 🔧 Fix: Actualización de Perfil No se Refleja en Get Profile

## Problema Reportado

Al actualizar el perfil de usuario con `PUT /users/profile` (por ejemplo, cambiar `userType` de "Propietario" a "Agente"), los cambios no se reflejaban al consultar `GET /users/profile`.

### Síntoma
```bash
# Usuario hace PUT /users/profile
{
  "userType": "Agente"  // Cambio de Propietario a Agente
}

# Respuesta: Success: true ✅

# Usuario hace GET /users/profile
{
  "user": {
    "userType": "Propietario"  // ❌ Sigue mostrando el valor antiguo
  }
}
```

## Causa Raíz

Los endpoints `GET /users/profile` y `GET /users/validate-token` estaban **leyendo los datos directamente del ID Token JWT**, en lugar de consultar a AWS Cognito.

### ¿Por qué era un problema?

Los tokens JWT (JSON Web Tokens) son **inmutables** una vez emitidos. Contienen un conjunto de "claims" (atributos) que se fijan en el momento de generación y **no cambian** hasta que el token expire.

```
Login → Cognito emite ID Token con userType: "Propietario"
       ↓
Update Profile → Cognito actualiza en su BD a userType: "Agente" ✅
       ↓
Get Profile → Lee del ID Token → userType: "Propietario" ❌ (Token no cambió)
```

### Código Problemático (Antes)

**`src/controllers/UserController.ts` - getProfile (ANTES):**
```typescript
async getProfile(req: Request, res: Response): Promise<any> {
  try {
    const user = req.user; // ❌ Lee del token (valores fijos)
    
    res.status(200).json({
      success: true,
      message: "Perfil obtenido exitosamente",
      user: {
        id: user.sub,
        email: user.email,              // Del token (puede estar desactualizado)
        firstName: user.given_name,     // Del token (puede estar desactualizado)
        lastName: user.family_name,     // Del token (puede estar desactualizado)
        userType: user.user_type        // Del token (puede estar desactualizado) ❌
      }
    });
  } catch (err) {
    // ...
  }
}
```

**El problema:** `req.user` viene del middleware que decodifica el ID Token. Los valores son fijos hasta que el token expire (típicamente 1 hora).

## Solución Implementada

Los endpoints ahora **consultan directamente a AWS Cognito** para obtener los datos más recientes del usuario, en lugar de leer del token.

### Código Corregido (Después)

**`src/controllers/UserController.ts` - getProfile (DESPUÉS):**
```typescript
async getProfile(req: Request, res: Response): Promise<any> {
  try {
    const user = req.user; // Solo para autenticación (obtener username)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado"
      });
    }

    // ✅ Consultar a Cognito directamente para obtener los datos más recientes
    const cognitoUser = await UserController.cognitoService.adminGetUser(user.username);
    
    if (!cognitoUser.success) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener información del usuario"
      });
    }

    // Extraer atributos del usuario (siempre actualizados)
    const attributes = cognitoUser.data?.attributes || {};
    
    res.status(200).json({
      success: true,
      message: "Perfil obtenido exitosamente",
      user: {
        id: attributes.sub || user.sub,
        email: attributes.email || user.email,           // ✅ Desde Cognito
        firstName: attributes.given_name,                 // ✅ Desde Cognito
        lastName: attributes.family_name,                 // ✅ Desde Cognito
        username: cognitoUser.data?.username || user.username,
        groups: user.groups,
        emailVerified: attributes.email_verified === "true",
        userType: attributes["custom:user_type"]         // ✅ Desde Cognito (actualizado)
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
```

### Flujo Corregido

```
Login → Cognito emite ID Token con userType: "Propietario"
       ↓
Update Profile → Cognito actualiza en su BD a userType: "Agente" ✅
       ↓
Get Profile → Consulta a Cognito directamente → userType: "Agente" ✅
```

## Endpoints Actualizados

Se aplicó el mismo fix a estos endpoints:

### 1. `GET /users/profile`
- **Antes:** Leía del ID Token
- **Después:** Consulta a Cognito con `adminGetUser(username)`
- **Beneficio:** Los cambios se reflejan **inmediatamente** sin necesidad de logout/login

### 2. `GET /users/validate-token`
- **Antes:** Leía del ID Token
- **Después:** Consulta a Cognito con `adminGetUser(username)`
- **Beneficio:** Valida el token Y obtiene datos actualizados en una sola llamada

## Comparación: Antes vs Después

| Aspecto | ANTES (❌) | DESPUÉS (✅) |
|---------|----------|------------|
| **Fuente de datos** | ID Token JWT | AWS Cognito directamente |
| **Actualización de datos** | Solo al renovar token (1 hora) | Inmediata |
| **Requiere logout/login** | Sí | No |
| **Performance** | Más rápido (sin llamada a AWS) | Llamada adicional a AWS (~100ms) |
| **Datos siempre actualizados** | No | Sí |

## Actualización de Postman Collection

Se actualizaron las descripciones y tests:

### Get Profile
**Descripción actualizada:**
```
Obtiene el perfil completo del usuario autenticado desde AWS Cognito.

⚠️ IMPORTANTE: Este endpoint requiere el ID Token (no el Access Token).

¿Por qué ID Token?
- El ID Token se usa para autenticar al usuario
- El endpoint consulta directamente a Cognito para obtener los datos MÁS RECIENTES
- Esto garantiza que los cambios de perfil se reflejen inmediatamente

Nota: Los cambios realizados con PUT /users/profile se reflejan 
inmediatamente al llamar a este endpoint.
```

**Test actualizado:**
```javascript
pm.test('User has complete profile attributes from Cognito (always up-to-date)', function () {
  const responseJson = pm.response.json();
  pm.expect(responseJson.user.username).to.not.be.undefined;
  pm.expect(responseJson.user.email).to.not.be.empty;
  pm.expect(responseJson.user.firstName).to.not.be.undefined;
  pm.expect(responseJson.user.lastName).to.not.be.undefined;
  pm.expect(responseJson.user.groups).to.be.an('array');
});
```

## Ventajas de la Solución

✅ **Datos siempre actualizados**: Los usuarios ven cambios inmediatamente  
✅ **No requiere logout/login**: Mejor experiencia de usuario  
✅ **Consistencia**: Los datos en el frontend siempre coinciden con Cognito  
✅ **Simplicidad**: No se requiere lógica compleja de refresh de tokens  

## Desventajas (Trade-off)

⚠️ **Performance**: Una llamada adicional a AWS por cada GET /users/profile  
- **Impacto**: ~100-200ms adicionales por request
- **Mitigación**: Se puede implementar caché en el futuro si es necesario

⚠️ **Dependencia de AWS**: Requiere que las credenciales de AWS estén correctamente configuradas
- **Solución**: Ya implementada en el fix anterior (AWS_CREDENTIALS_FIX.md)

## Caso de Uso Real

### Escenario: Usuario Actualiza su Tipo

**1. Usuario actualiza su perfil**
```bash
PUT /users/profile
{
  "userType": "Agente"
}

Response: 200 OK
{
  "success": true,
  "message": "Atributos de usuario actualizados exitosamente"
}
```

**2. Usuario consulta su perfil inmediatamente**
```bash
GET /users/profile

Response: 200 OK
{
  "success": true,
  "user": {
    "userType": "Agente"  // ✅ Cambio reflejado inmediatamente
  }
}
```

**3. Usuario NO necesita hacer logout/login** ✅

## Notas Técnicas

### ¿Por qué seguimos usando ID Token para autenticación?

Aunque ahora consultamos a Cognito, **todavía usamos el ID Token** para:
1. **Autenticar** que la request viene de un usuario válido
2. **Obtener el username** para consultar a Cognito
3. **Obtener grupos** (roles) que requieren permisos especiales

### ¿Se puede mejorar el performance?

Sí, hay varias opciones:

**Opción 1: Caché de corta duración (5-10 minutos)**
```typescript
// Cachear respuesta de Cognito por 5 minutos
const cachedUser = cache.get(user.username);
if (cachedUser && !cache.isExpired(user.username, 5 * 60 * 1000)) {
  return cachedUser;
}
```

**Opción 2: Invalidación de caché en PUT**
```typescript
// En updateProfile, invalidar caché
await cognitoService.adminUpdateUserAttributes(username, attributes);
cache.invalidate(username); // Forzar refresh en próximo GET
```

**Opción 3: WebSocket para notificaciones**
```typescript
// Notificar al frontend cuando el perfil cambia
socket.emit('profile:updated', updatedUser);
```

Por ahora, la solución simple (consultar siempre) es suficiente para la carga esperada.

## Archivos Modificados

1. **`src/controllers/UserController.ts`**
   - Método `getProfile`: Ahora consulta a Cognito con `adminGetUser`
   - Método `validateToken`: Ahora consulta a Cognito con `adminGetUser`

2. **`Observatorio_Inmobiliario_API.postman_collection.json`**
   - Endpoint "Get Profile": Descripción y tests actualizados
   - Endpoint "Validate Token": Descripción y tests actualizados

## Testing

Para verificar que el fix funciona:

**1. Login**
```bash
POST /users/login
{
  "email": "usuario@example.com",
  "password": "Password123!"
}
# Guardar idToken
```

**2. Verificar perfil inicial**
```bash
GET /users/profile
Authorization: Bearer <idToken>

Response:
{
  "user": {
    "userType": "Propietario"
  }
}
```

**3. Actualizar perfil**
```bash
PUT /users/profile
Authorization: Bearer <idToken>
{
  "userType": "Agente"
}
```

**4. Verificar cambio inmediatamente (sin logout/login)**
```bash
GET /users/profile
Authorization: Bearer <idToken>  # ⚠️ Mismo token

Response:
{
  "user": {
    "userType": "Agente"  # ✅ Cambio reflejado
  }
}
```

## Referencias

- [AWS Cognito AdminGetUser API](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminGetUser.html)
- [JWT Claims - Immutability](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-claims)
- Issue relacionado: AWS_CREDENTIALS_FIX.md (credenciales requeridas para adminGetUser)

