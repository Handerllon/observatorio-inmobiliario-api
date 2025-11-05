# 🔧 Fix: AWS Credentials Error en Update Profile

## Problema Reportado

Al intentar actualizar el perfil de usuario con el ID Token, el servidor devolvía el siguiente error:

```
CredentialsProviderError: Could not load credentials from any providers
    at /home/ec2-user/observatorio-inmobiliario-api/node_modules/@aws-sdk/credential-provider-node/dist-cjs/index.js:77:11
```

### Síntoma
```bash
[ 2025-11-05 21:25:42 - ERROR ] Error al actualizar atributos: CredentialsProviderError: Could not load credentials from any providers
```

## Causa Raíz

Había **dos errores relacionados con credenciales de AWS**:

### 1. Nombre Incorrecto de Variable de Entorno

En `.env_example` y potencialmente en los archivos `.env` de producción, la variable estaba definida como:

```bash
AWS_SECRET_ACCESS_KEY_ID=your-aws-secret-access-key  # ❌ INCORRECTO
```

El nombre correcto según AWS SDK es:

```bash
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key  # ✅ CORRECTO
```

### 2. Clientes AWS SDK sin Credenciales Explícitas

Los clientes de AWS SDK en `CognitoService` y `AwsAdapter` no estaban configurados con credenciales explícitas, esperando que se cargaran automáticamente desde:
- Variables de entorno
- Archivo `~/.aws/credentials`
- IAM Role (en EC2)

Sin embargo, debido al nombre incorrecto de la variable, las credenciales nunca se cargaban correctamente.

## Solución Implementada

### 1. Corrección de Variable de Entorno

**`.env_example`** - Corregido el nombre de la variable:

```diff
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
- AWS_SECRET_ACCESS_KEY_ID=your-aws-secret-access-key
+ AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

### 2. Configuración Explícita en CognitoService

**`src/services/CognitoService.ts`** - Añadidas credenciales explícitas al cliente:

```typescript
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
      "COGNITO_USER_POOL_ID y COGNITO_CLIENT_ID son requeridos"
    );
  }

  // ✅ Validar credenciales de AWS para operaciones administrativas
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    logger.warning(
      "AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY no están configuradas. " +
      "Las operaciones administrativas de Cognito fallarán."
    );
  }

  // ✅ Configurar cliente con credenciales explícitas
  this.client = new CognitoIdentityProviderClient({
    region: this.config.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  this.userPool = new CognitoUserPool({
    UserPoolId: this.config.userPoolId,
    ClientId: this.config.clientId,
  });
}
```

### 3. Corrección en AwsAdapter

**`src/utils/AwsAdapter.ts`** - Corregido el nombre de la variable:

**Antes:**
```typescript
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_ID || "",  // ❌ _ID al final
};

private validateConfiguration(): void {
  const required = [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY_ID",  // ❌ _ID al final
    // ...
  ];
}
```

**Después:**
```typescript
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",  // ✅ Sin _ID
};

private validateConfiguration(): void {
  const required = [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",  // ✅ Sin _ID
    // ...
  ];
}
```

## Acción Requerida en Producción

⚠️ **IMPORTANTE**: Si ya tienes un archivo `.env` en producción, debes actualizar el nombre de la variable:

```bash
# En tu servidor de producción (EC2), edita el archivo .env
cd /home/ec2-user/observatorio-inmobiliario-api

# Cambiar:
# AWS_SECRET_ACCESS_KEY_ID=tu-secret-access-key-real
# Por:
# AWS_SECRET_ACCESS_KEY=tu-secret-access-key-real
```

Luego, reinicia la aplicación:

```bash
pm2 restart observatorio-inmobiliario-api
# o
pm2 restart all
```

## Verificación

Para verificar que las credenciales están correctamente configuradas:

1. **En inicio de la aplicación**, deberías ver estos logs:
   ```
   [ ... - INFO ] 🚀 Servidor iniciado en puerto 9000
   [ ... - INFO ] 📊 Base de datos conectada
   ```

2. **Si faltan credenciales**, verás este warning:
   ```
   [ ... - WARNING ] AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY no están configuradas. 
                     Las operaciones administrativas de Cognito fallarán.
   ```

3. **Al actualizar perfil**, NO deberías ver errores de `CredentialsProviderError`.

## Operaciones que Requieren Credenciales AWS

Las siguientes operaciones de Cognito requieren credenciales de AWS válidas:

- ✅ `PUT /users/profile` - Actualizar perfil de usuario
- ✅ `GET /users` - Listar usuarios (admin)
- ✅ `GET /users/:username` - Obtener usuario por username (admin)
- ✅ `PUT /users/:username` - Actualizar usuario (admin)
- ✅ `DELETE /users/:username` - Deshabilitar usuario (admin)

**Nota:** Las operaciones de registro, login, confirmación y cambio de contraseña NO requieren credenciales de AWS, ya que usan el SDK de cliente de Cognito.

## Servicios Afectados

Los siguientes servicios utilizan credenciales de AWS:

1. **CognitoService** - Operaciones administrativas en Cognito
2. **AwsAdapter** - Todas las operaciones:
   - Lambda (predicciones ML)
   - S3 (imágenes, métricas, parquet)
   - Location Service (geocodificación)

## Archivos Modificados

1. **`.env_example`**
   - Corregido nombre de variable `AWS_SECRET_ACCESS_KEY_ID` → `AWS_SECRET_ACCESS_KEY`

2. **`src/services/CognitoService.ts`**
   - Añadida validación de credenciales
   - Configuración explícita de credenciales en el cliente

3. **`src/utils/AwsAdapter.ts`**
   - Corregido nombre de variable en constructor
   - Corregido nombre de variable en validación

## Prevención de Errores Futuros

Para evitar este tipo de errores:

1. **Siempre usar nombres estándar de AWS**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

2. **Validar credenciales en startup**:
   - Los servicios ahora validan credenciales en el constructor
   - Logs de warning si faltan credenciales

3. **Usar credenciales explícitas**:
   - No confiar en carga automática de credenciales
   - Pasar credenciales explícitamente a cada cliente AWS

## Referencias

- [AWS SDK Credentials Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
- [AWS Cognito Identity Provider Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/)

