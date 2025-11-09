# 🔐 Solución al Error de SECRET_HASH en AWS Cognito

## ❌ Error Original

```
"message": "Client 5d61k1ijkp35mb8pbg2kcc8280 is configured with secret but SECRET_HASH was not received"
```

## ✅ Problema Resuelto

El error ocurre cuando tu **App Client** en AWS Cognito está configurado con un **Client Secret**, pero no se estaba calculando y enviando el `SECRET_HASH` en las peticiones.

### ¿Qué se actualizó?

He modificado el `CognitoService.ts` para:

1. ✅ **Calcular el SECRET_HASH** automáticamente usando HMAC-SHA256
2. ✅ **Agregar SECRET_HASH** a todas las operaciones que lo requieren:
   - `register()` - Registro de usuarios
   - `confirmSignUp()` - Confirmación de email
   - `login()` - Inicio de sesión
   - `forgotPassword()` - Recuperación de contraseña
   - `confirmForgotPassword()` - Confirmación de nueva contraseña

3. ✅ **Cambiar el método de autenticación** de `CognitoUser.authenticateUser()` a `InitiateAuthCommand` con flujo `USER_PASSWORD_AUTH`

### Cálculo del SECRET_HASH

```typescript
private calculateSecretHash(username: string): string {
  if (!this.config.clientSecret) {
    return "";
  }

  // Formula: HMAC-SHA256(username + clientId, clientSecret)
  const message = username + this.config.clientId;
  const hmac = crypto.createHmac("sha256", this.config.clientSecret);
  hmac.update(message);
  return hmac.digest("base64");
}
```

## 🔧 Configuración Requerida en AWS Cognito

### Paso 1: Habilitar USER_PASSWORD_AUTH en el App Client

1. Ve a **AWS Console** → **Cognito** → **User Pools**
2. Selecciona tu User Pool
3. Ve a **App integration** → **App clients**
4. Selecciona tu App Client
5. Haz clic en **Edit**
6. En **Authentication flows**, asegúrate de tener habilitado:
   - ✅ **ALLOW_USER_PASSWORD_AUTH**
   - ✅ **ALLOW_REFRESH_TOKEN_AUTH**
   - ✅ **ALLOW_USER_SRP_AUTH** (opcional)
7. Haz clic en **Save changes**

### Paso 2: Verificar las Variables de Entorno

Asegúrate de tener configurado el `COGNITO_CLIENT_SECRET` en tu archivo `.env`:

```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret
```

**¿Dónde encontrar el Client Secret?**

1. AWS Console → Cognito → User Pools → Tu pool
2. App integration → App clients → Tu app client
3. Haz clic en **Show client secret**
4. Copia el valor

## 🚀 Cómo Funciona Ahora

### Registro (con SECRET_HASH)

```typescript
const username = "user@example.com";
const params = {
  ClientId: "your-client-id",
  Username: username,
  Password: "Password123!",
  SecretHash: calculateSecretHash(username), // ✅ Se calcula automáticamente
  UserAttributes: [...]
};
```

### Login (con USER_PASSWORD_AUTH)

```typescript
const params = {
  AuthFlow: "USER_PASSWORD_AUTH",
  ClientId: "your-client-id",
  AuthParameters: {
    USERNAME: username,
    PASSWORD: password,
    SECRET_HASH: calculateSecretHash(username) // ✅ Se calcula automáticamente
  }
};
```

## 🧪 Probar la Solución

### 1. Reinicia el servidor

```bash
npm run start
```

### 2. Prueba el registro

```bash
curl -X POST http://localhost:9000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Test123!"
  }'
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

### 3. Confirma el email

Revisa tu email y copia el código de 6 dígitos.

```bash
curl -X POST http://localhost:9000/users/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "confirmationCode": "123456"
  }'
```

### 4. Prueba el login

```bash
curl -X POST http://localhost:9000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "accessToken": "eyJraWQiOiI...",
  "idToken": "eyJraWQiOiI...",
  "refreshToken": "eyJjdHkiOiI..."
}
```

## 📋 Checklist de Verificación

- [ ] Variables de entorno configuradas (incluyendo `COGNITO_CLIENT_SECRET`)
- [ ] App Client tiene habilitado `ALLOW_USER_PASSWORD_AUTH`
- [ ] Servidor reiniciado después de los cambios
- [ ] Código actualizado con el cálculo de SECRET_HASH
- [ ] Login funciona correctamente

## 🔍 Alternativa: App Client sin Secret

Si prefieres **NO usar Client Secret** (más simple pero menos seguro):

1. Ve a AWS Console → Cognito → User Pools
2. **Crea un nuevo App Client** o modifica el existente
3. En **App client information**:
   - **Client secret:** Selecciona "Don't generate a client secret"
4. Guarda los cambios
5. Actualiza el `COGNITO_CLIENT_ID` en tu `.env` con el nuevo client ID

**Nota:** Sin client secret:
- ✅ Más simple (no necesitas calcular SECRET_HASH)
- ❌ Menos seguro (el client ID puede ser expuesto)
- ⚠️ Recomendado solo para desarrollo o aplicaciones públicas (web, mobile)

## 📚 Referencias

- [AWS Cognito - Using SecretHash](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html#cognito-user-pools-computing-secret-hash)
- [AWS Cognito - Authentication Flow](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow.html)

---

✅ **Problema resuelto!** El sistema ahora calcula y envía automáticamente el SECRET_HASH cuando es necesario.

