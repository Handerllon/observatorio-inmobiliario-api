# 🏷️ Atributos Personalizados en AWS Cognito

## 📋 Atributo `user_type`

Hemos agregado el atributo personalizado `user_type` para clasificar a los usuarios según su rol en la aplicación inmobiliaria.

### Valores Permitidos

- **`Propietario`** - Usuario que posee propiedades y las pone en alquiler
- **`Agente`** - Agente inmobiliario que gestiona propiedades
- **`Inquilino`** - Usuario que busca alquilar propiedades

## 🔧 Configuración en AWS Cognito

### Paso 1: Crear el Atributo Personalizado

1. Ve a **AWS Console** → **Cognito** → **User Pools**
2. Selecciona tu User Pool: `observatorio-inmobiliario-users`
3. Ve a **Sign-up experience** → **Attributes**
4. Haz clic en **Edit**
5. En **Custom attributes**, haz clic en **Add custom attribute**
6. Configura el atributo:
   - **Attribute name:** `user_type`
   - **Attribute type:** String
   - **Min length:** 5 (para "Agente")
   - **Max length:** 11 (para "Propietario")
   - **Mutable:** ✅ Yes (puede ser modificado después)
7. Haz clic en **Save changes**

**⚠️ IMPORTANTE:** Los atributos personalizados en Cognito siempre tienen el prefijo `custom:`, por ejemplo: `custom:user_type`

### Paso 2: Configurar Scope del Atributo en el Token

Para que el atributo `user_type` aparezca en el Access Token, necesitas configurar los scopes:

1. En tu User Pool, ve a **App integration** → **App clients**
2. Selecciona tu App Client
3. Ve a **Edit hosted UI settings** (o **OAuth 2.0 settings**)
4. En **Attributes read and write permissions**, asegúrate de que `custom:user_type` tenga permisos de:
   - ✅ **Read**
   - ✅ **Write**
5. **Save changes**

**Nota:** Si usas el flujo `USER_PASSWORD_AUTH`, los atributos personalizados están disponibles automáticamente en el token.

## 📝 Uso en la API

### Registro de Usuario con user_type

```bash
curl -X POST http://localhost:9000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "María",
    "lastName": "González",
    "email": "maria@example.com",
    "password": "Password123!",
    "userType": "Propietario"
  }'
```

**Respuesta:**
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

### Registro sin user_type (opcional)

Si no se proporciona `userType`, el usuario se crea sin este atributo:

```bash
curl -X POST http://localhost:9000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "password": "Password123!"
  }'
```

### Obtener Perfil (incluye user_type)

```bash
curl -X GET http://localhost:9000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Perfil obtenido exitosamente",
  "user": {
    "id": "abc123...",
    "email": "maria@example.com",
    "firstName": "María",
    "lastName": "González",
    "username": "maria@example.com",
    "groups": ["user"],
    "emailVerified": true,
    "userType": "Propietario"
  }
}
```

### Actualizar user_type

```bash
curl -X PUT http://localhost:9000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "Agente"
  }'
```

### Admin: Actualizar user_type de otro usuario

```bash
curl -X PUT http://localhost:9000/users/usuario@example.com \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Carlos",
    "userType": "Inquilino"
  }'
```

## 🔍 Validaciones Implementadas

### En el Registro

```typescript
// Validar que userType sea uno de los valores permitidos
if (userData.userType && !["Propietario", "Agente", "Inquilino"].includes(userData.userType)) {
  return res.status(400).json({
    success: false,
    message: "userType debe ser 'Propietario', 'Agente' o 'Inquilino'"
  });
}
```

### En la Actualización

La misma validación se aplica al actualizar el perfil.

## 📊 Estructura de Datos

### Interface TypeScript

```typescript
export interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  username: string;
  user_type?: "Propietario" | "Agente" | "Inquilino"; // ✅ Nuevo atributo
}
```

### RegisterDto

```typescript
export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  userType?: "Propietario" | "Agente" | "Inquilino"; // ✅ Opcional
}
```

### UpdateUserDto

```typescript
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  userType?: "Propietario" | "Agente" | "Inquilino"; // ✅ Nuevo campo
}
```

## 🎯 Casos de Uso

### 1. Filtrar propiedades según tipo de usuario

```typescript
// En el frontend
if (user.userType === "Propietario") {
  // Mostrar panel de gestión de propiedades
} else if (user.userType === "Inquilino") {
  // Mostrar búsqueda de propiedades
} else if (user.userType === "Agente") {
  // Mostrar panel de gestión de clientes y propiedades
}
```

### 2. Autorización basada en user_type

```typescript
// En el middleware o controlador
if (req.user?.user_type !== "Propietario") {
  return res.status(403).json({
    success: false,
    message: "Solo propietarios pueden publicar propiedades"
  });
}
```

### 3. Estadísticas por tipo de usuario

```typescript
const propietarios = users.filter(u => u.user_type === "Propietario").length;
const inquilinos = users.filter(u => u.user_type === "Inquilino").length;
const agentes = users.filter(u => u.user_type === "Agente").length;
```

## 🧪 Testing con Postman

He actualizado la colección de Postman para incluir ejemplos con `userType`.

### Ejemplo de Request de Registro:

```json
{
  "firstName": "María",
  "lastName": "González",
  "email": "maria.gonzalez@example.com",
  "password": "SecurePass123!",
  "userType": "Propietario"
}
```

### Variables de Postman

Puedes guardar el `userType` en una variable:

```javascript
// En el script de test del login
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.data && responseJson.data.payload) {
        pm.environment.set('user_type', responseJson.data.payload['custom:user_type']);
    }
}
```

## ⚠️ Notas Importantes

1. **Atributos personalizados son inmutables en estructura:** Una vez creado el atributo `custom:user_type`, no puedes cambiar su tipo o eliminarlo. Solo puedes cambiar su valor.

2. **Prefijo obligatorio:** En Cognito, siempre usa `custom:user_type`. En tu código, lo mapeamos a `user_type` para mayor claridad.

3. **Opcional por defecto:** El atributo `userType` es opcional. Los usuarios existentes no lo tendrán hasta que lo actualicen.

4. **Token refresh:** Si cambias el `user_type`, el usuario debe hacer login nuevamente para que aparezca el nuevo valor en el token.

## 🔄 Agregar Más Atributos Personalizados

Si necesitas agregar más atributos en el futuro (por ejemplo, `phone`, `address`, etc.):

1. **Crear el atributo en AWS Cognito:**
   - Sign-up experience → Attributes → Add custom attribute
   
2. **Actualizar el código:**
   ```typescript
   // En RegisterDto
   newAttribute?: string;
   
   // En el registro (CognitoService)
   if (userData.newAttribute) {
     userAttributes.push({
       Name: "custom:new_attribute",
       Value: userData.newAttribute,
     });
   }
   
   // En CognitoUser interface
   new_attribute?: string;
   
   // En el middleware
   new_attribute: payload["custom:new_attribute"]
   ```

## 📚 Referencias

- [AWS Cognito - Custom Attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html)
- [AWS Cognito - Token Claims](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)

---

✅ **El atributo `user_type` está completamente integrado y listo para usar!**

