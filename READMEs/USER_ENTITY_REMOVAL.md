# 🗑️ Eliminación de Entidad User y UserService

## Resumen

Se ha eliminado completamente la entidad `User` y el servicio `UserService` del proyecto, ya que toda la gestión de usuarios se realiza mediante **AWS Cognito**. Esto elimina redundancia y simplifica la arquitectura.

---

## ¿Por qué se eliminó?

### Razones para la Eliminación

1. **Redundancia Total:** AWS Cognito ya maneja toda la información de usuarios (email, nombre, contraseñas, atributos personalizados, roles/grupos)

2. **No hay Relaciones de Base de Datos:** La entidad `RentPrediction` usa `cognitoSub` (string) directamente, sin foreign keys a la tabla `users`

3. **UserController ya usaba Cognito:** De 13 métodos en `UserController`, solo 1 método (`getAllUsers`) usaba `UserService` - los otros 12 ya usaban `CognitoService`

4. **Nota Incorrecta:** El comentario en `getAllUsers` decía que "Cognito no tiene endpoint para listar usuarios" - esto es **falso**, Cognito tiene `ListUsersCommand`

---

## Archivos Eliminados

### ❌ Eliminados Completamente

```
src/entities/User.entity.ts
src/services/UserService.ts
```

**Total:** 2 archivos eliminados (~400 líneas de código redundante)

---

## Archivos Modificados

### ✅ `src/services/CognitoService.ts`

**Cambios:**
1. ✅ Agregado import `ListUsersCommand`
2. ✅ Nuevo método `listUsers()` con soporte de paginación

**Método Agregado:**
```typescript
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
```

---

### ✅ `src/controllers/UserController.ts`

**Cambios:**
1. ❌ Eliminado import de `UserService`
2. ❌ Eliminada instancia `private static service: UserService`
3. ✅ Agregado import de `LoginDto` desde `CognitoService`
4. ✅ Refactorizado método `getAllUsers()` para usar Cognito

**Método Refactorizado:**

**ANTES:**
```typescript
// GET /users - Obtener todos los usuarios desde la base de datos local (solo admin)
// Nota: Cognito no tiene un endpoint simple para listar todos los usuarios ❌ INCORRECTO
// Esta funcionalidad mantiene la base de datos local para consultas
async getAllUsers(req: Request, res: Response): Promise<any> {
  try {
    const users = await UserController.service.getAllUsers(); // ❌ UserService
    
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
```

**DESPUÉS:**
```typescript
// GET /users - Obtener todos los usuarios desde Cognito (solo admin)
// Soporta paginación con query params: limit y paginationToken
async getAllUsers(req: Request, res: Response): Promise<any> {
  try {
    const limit = parseInt(req.query.limit as string) || 60;
    const paginationToken = req.query.paginationToken as string;

    logger.info(`📋 Listando usuarios de Cognito (limit: ${limit})`);

    const result = await UserController.cognitoService.listUsers(limit, paginationToken); // ✅ CognitoService
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      users: result.data?.users || [],
      total: result.data?.users?.length || 0,
      paginationToken: result.data?.paginationToken, // ✅ Soporte de paginación
      hasMore: result.data?.hasMore || false
    });
  } catch (err) {
    logger.error("Error al obtener usuarios:", err);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
}
```

---

## Estado Actual de UserController

### 📊 13 Métodos - TODOS usan Cognito

| Método | Servicio Utilizado | Estado |
|--------|-------------------|--------|
| `register` | `CognitoService.register()` | ✅ |
| `login` | `CognitoService.login()` | ✅ |
| `getProfile` | `req.user` (middleware) | ✅ |
| `updateProfile` | `CognitoService.adminUpdateUserAttributes()` | ✅ |
| `changePassword` | `CognitoService.changePassword()` | ✅ |
| `getAllUsers` | `CognitoService.listUsers()` | ✅ **REFACTORIZADO** |
| `getUserById` | `CognitoService.adminGetUser()` | ✅ |
| `updateUser` | `CognitoService.adminUpdateUserAttributes()` | ✅ |
| `deleteUser` | `CognitoService.adminDisableUser()` | ✅ |
| `validateToken` | `req.user` (middleware) | ✅ |
| `confirmSignUp` | `CognitoService.confirmSignUp()` | ✅ |
| `forgotPassword` | `CognitoService.forgotPassword()` | ✅ |
| `confirmForgotPassword` | `CognitoService.confirmForgotPassword()` | ✅ |
| `logout` | `CognitoService.globalSignOut()` | ✅ |

**Resultado:** 13/13 métodos (100%) ahora usan Cognito ✅

---

## Archivos Mantenidos

### ✅ Mantenidos (son necesarios)

```
src/controllers/UserController.ts  ✅ (Todos sus endpoints usan Cognito)
src/routes/UserRouter.ts            ✅ (Define las rutas de los endpoints)
```

**Razón:** Estos archivos son necesarios porque:
- `UserController` maneja la lógica HTTP de los endpoints de usuario
- `UserRouter` define las rutas y aplica middleware de autenticación
- Ambos trabajan exclusivamente con Cognito

---

## Endpoint GET /users Mejorado

### Nuevo Soporte de Paginación

**Request:**
```http
GET /users?limit=60&paginationToken=XXXXXX
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (opcional): Número de usuarios por página (default: 60, max: 60)
- `paginationToken` (opcional): Token para obtener la siguiente página

**Response:**
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
    // ... más usuarios
  ],
  "total": 60,
  "paginationToken": "NEXT_PAGE_TOKEN",  // null si no hay más páginas
  "hasMore": true  // false si es la última página
}
```

---

## Impacto en Base de Datos

### Tabla `users` (Postgres)

**Estado:** ⚠️ La tabla `users` puede existir en la base de datos pero ya no se usa

**Recomendación:**

Si deseas limpiar completamente la base de datos:

```sql
-- OPCIONAL: Eliminar tabla users si existe (NO hay foreign keys que la referencien)
DROP TABLE IF EXISTS users;
```

**Nota:** La tabla `rent_predictions` NO tiene foreign key a `users`, solo usa `cognitoSub` como string, por lo que eliminar la tabla `users` es seguro.

---

## Migración de Datos (si aplica)

### Si tenías usuarios en la tabla local

Si anteriormente tenías usuarios en la base de datos local que no están en Cognito:

**Opción 1: Migración Manual**
1. Exportar usuarios de la tabla `users`
2. Crear usuarios en Cognito mediante API o consola AWS
3. Actualizar `cognitoSub` en `rent_predictions` si es necesario

**Opción 2: No migrar**
- Si todos los usuarios ya están en Cognito, simplemente elimina la tabla

---

## Verificación

### ✅ Checklist Post-Eliminación

- [x] ❌ Entidad `User.entity.ts` eliminada
- [x] ❌ Servicio `UserService.ts` eliminado
- [x] ✅ `CognitoService.listUsers()` implementado
- [x] ✅ `UserController.getAllUsers()` refactorizado
- [x] ✅ Imports actualizados en `UserController`
- [x] ✅ No hay errores de linting
- [x] ✅ `LoginDto` importado correctamente
- [x] ✅ Soporte de paginación agregado

---

## Testing del Endpoint Refactorizado

### Ejemplo de Prueba

**Request:**
```bash
curl -X GET "http://localhost:3000/users?limit=10" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Respuesta Esperada:**
- Lista de usuarios desde Cognito
- Información completa de cada usuario
- Soporte de paginación funcional

---

## Beneficios de la Eliminación

### ✅ Ventajas

1. **Menos Código:** ~400 líneas de código redundante eliminadas
2. **Single Source of Truth:** Cognito es la única fuente de información de usuarios
3. **Sin Sincronización:** No hay que mantener sincronizada la tabla local con Cognito
4. **Mejor Escalabilidad:** Cognito maneja millones de usuarios sin problemas
5. **Seguridad Mejorada:** Cognito maneja passwords, tokens, MFA, etc.
6. **Menos Mantenimiento:** No hay que mantener UserService ni User.entity
7. **Arquitectura Más Limpia:** Responsabilidades claras

### 📊 Comparación

| Aspecto | ANTES (con User.entity) | DESPUÉS (solo Cognito) |
|---------|------------------------|------------------------|
| Fuente de usuarios | DB Local + Cognito | Solo Cognito ✅ |
| Sincronización | Necesaria | No necesaria ✅ |
| Código redundante | Sí | No ✅ |
| Complejidad | Alta | Baja ✅ |
| Mantenimiento | Alto | Bajo ✅ |
| Escalabilidad | Limitada | Ilimitada ✅ |

---

## Próximos Pasos (Opcional)

### Si deseas limpiar completamente:

1. **Eliminar tabla users de PostgreSQL:**
   ```sql
   DROP TABLE IF EXISTS users;
   ```

2. **Verificar que RentPrediction no tenga referencias:**
   ```sql
   -- Verificar que cognitoSub es string, no foreign key
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'rent_predictions' 
   AND column_name = 'cognitoSub';
   ```

3. **Actualizar Postman Collection:**
   - Documentar soporte de paginación en GET /users
   - Agregar ejemplos con `paginationToken`

---

## Conclusión

✅ **La entidad User y UserService han sido eliminados exitosamente.**

✅ **Toda la gestión de usuarios ahora se realiza exclusivamente mediante AWS Cognito.**

✅ **El código es más limpio, mantenible y escalable.**

✅ **No hay errores de linting.**

🎉 **¡Migración completada!**

