# 🚀 Migración Completa a AWS Cognito

## ✅ Cambios Implementados

### 1. Dependencias Instaladas
- ✅ `amazon-cognito-identity-js` - SDK de Cognito para JavaScript
- ✅ `aws-jwt-verify` - Verificación de tokens JWT de AWS
- ✅ `@aws-sdk/client-cognito-identity-provider` - SDK de AWS para operaciones de Cognito

### 2. Nuevos Archivos Creados

#### `/src/services/CognitoService.ts`
Servicio completo para interactuar con AWS Cognito:
- Registro de usuarios
- Confirmación de registro
- Login
- Cambio de contraseña
- Recuperación de contraseña
- Operaciones administrativas (obtener, actualizar, deshabilitar usuarios)

#### `/src/middleware/cognito.middleware.ts`
Middleware de autenticación y autorización:
- Verifica tokens JWT emitidos por AWS Cognito
- Extrae información del usuario del token
- Autorización basada en grupos de Cognito (roles)
- Autenticación opcional para endpoints públicos/privados

#### `/COGNITO_SETUP.md`
Documentación completa de configuración de AWS Cognito.

### 3. Archivos Modificados

#### `/src/controllers/UserController.ts`
- ✅ Integrado con `CognitoService`
- ✅ Todos los endpoints ahora usan Cognito
- ✅ Nuevos endpoints agregados:
  - `POST /users/confirm` - Confirmar registro
  - `POST /users/forgot-password` - Recuperar contraseña
  - `POST /users/confirm-forgot-password` - Confirmar nueva contraseña
  - `POST /users/logout` - Cerrar sesión global

#### `/src/routes/UserRouter.ts`
- ✅ Cambiado de `AuthMiddleware` a `CognitoMiddleware`
- ✅ Nuevas rutas públicas agregadas
- ✅ Autorización basada en grupos de Cognito

#### `/src/entities/User.entity.ts`
- ✅ Agregado campo `cognitoSub` (ID único de Cognito)
- ✅ Campo `password` ahora es nullable (Cognito maneja contraseñas)

#### `/.env_example`
- ✅ Variables de entorno de Cognito agregadas

## 📋 Pasos Siguientes

### Paso 1: Configurar Variables de Entorno

1. Copia tu archivo de environment:
```bash
cp .env_example .env
```

2. Edita el archivo `.env` y completa las variables de Cognito:
```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=tu-user-pool-id
COGNITO_CLIENT_ID=tu-client-id
COGNITO_CLIENT_SECRET=tu-client-secret  # opcional
```

3. Para obtener estos valores:
   - Ve a AWS Console → Cognito → User Pools
   - Selecciona tu User Pool
   - **User Pool ID**: Lo encuentras en la parte superior
   - **Region**: En la URL o en el ID del pool (ej: us-east-1)
   - **Client ID y Secret**: Ve a "App integration" → "App clients"

### Paso 2: Migrar la Base de Datos

La entidad `User` ahora tiene un nuevo campo `cognitoSub`. Necesitas crear una migración:

**Opción A: Generar migración automática con TypeORM**
```bash
npm run typeorm migration:generate -- src/migrations/AddCognitoSubToUser
npm run typeorm migration:run
```

**Opción B: Crear migración manualmente**
```sql
ALTER TABLE users 
ADD COLUMN "cognitoSub" VARCHAR(255) NULL,
ADD CONSTRAINT "UQ_cognitoSub" UNIQUE ("cognitoSub");

ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;
```

### Paso 3: Configurar AWS Cognito

Sigue la guía completa en `COGNITO_SETUP.md` para:
1. Configurar User Pool
2. Crear App Client
3. Crear grupos (admin, user)
4. Configurar permisos IAM (para operaciones admin)

### Paso 4: Crear Primer Usuario Admin

1. Inicia tu aplicación:
```bash
npm run start
```

2. Registra un usuario:
```bash
curl -X POST http://localhost:9000/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

3. Verifica el email y confirma el registro:
```bash
curl -X POST http://localhost:9000/users/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "confirmationCode": "123456"
  }'
```

4. Ve a AWS Console → Cognito → Users and groups
5. Selecciona el usuario → "Add to group" → Selecciona "admin"

6. Ahora puedes hacer login:
```bash
curl -X POST http://localhost:9000/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

### Paso 5: Testing

Prueba los endpoints principales:

**Login:**
```bash
curl -X POST http://localhost:9000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'
```

**Obtener perfil (usa el accessToken del login):**
```bash
curl -X GET http://localhost:9000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Validar token:**
```bash
curl -X GET http://localhost:9000/users/validate-token \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔄 Migración de Usuarios Existentes

Si tienes usuarios en tu base de datos actual, tienes varias opciones:

### Opción 1: Invitar usuarios a re-registrarse
1. Enviar email a usuarios existentes
2. Pedirles que se registren nuevamente en el sistema
3. Sincronizar datos adicionales usando el `cognitoSub`

### Opción 2: Importación masiva a Cognito
Usar AWS CLI para importar usuarios:

```bash
# Crear CSV con formato de Cognito
# Ejecutar import
aws cognito-idp create-user-import-job \
  --user-pool-id us-east-1_XXXXXX \
  --job-name "import-existing-users" \
  --cloud-watch-logs-role-arn "arn:aws:iam::ACCOUNT:role/CognitoImportRole"
```

### Opción 3: Migración con Lambda Trigger
Configurar un trigger de migración en Cognito que valida contraseñas desde tu DB actual.

## ⚠️ Cambios de Comportamiento

### Antes vs Después

| Característica | Antes (JWT propio) | Ahora (Cognito) |
|----------------|-------------------|-----------------|
| Registro | Confirmación inmediata | Requiere verificación de email |
| Tokens | JWT custom, 24h | Access Token (1h), Refresh Token |
| Contraseñas | Almacenadas en DB | Manejadas por Cognito |
| Roles | Campo `role` en DB | Grupos de Cognito |
| Recuperación pwd | Manual | Built-in con email |
| MFA | No disponible | Disponible en Cognito |

### Endpoints Eliminados
Ninguno - Todos los endpoints existentes se mantienen con la misma API.

### Endpoints Nuevos
- `POST /users/confirm` - Confirmar email después de registro
- `POST /users/forgot-password` - Iniciar recuperación de contraseña
- `POST /users/confirm-forgot-password` - Confirmar nueva contraseña
- `POST /users/logout` - Cerrar sesión en todos los dispositivos

## 🔒 Seguridad

### Mejoras de Seguridad con Cognito
1. ✅ Contraseñas nunca almacenadas localmente
2. ✅ Tokens firmados por AWS (más seguros)
3. ✅ Rotación automática de tokens
4. ✅ MFA disponible
5. ✅ Rate limiting automático
6. ✅ Protección contra ataques de fuerza bruta

### Consideraciones
- Los tokens de Cognito expiran más rápido (1h vs 24h)
- Implementar refresh token en el frontend
- Configurar HTTPS en producción
- Habilitar CloudWatch Logs para auditoría

## 📊 Costos de AWS Cognito

### Free Tier
- 50,000 Monthly Active Users (MAU) gratuitos
- Después: $0.0055 por MAU

### Ejemplo de Costos
- 1,000 usuarios: **GRATIS**
- 10,000 usuarios: **GRATIS**
- 60,000 usuarios: ~$55/mes (solo por los 10,000 adicionales)

## 🧪 Testing

### Variables de Entorno para Testing
Crea un `.env.test` con credenciales de un User Pool de testing:

```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_TEST
COGNITO_CLIENT_ID=test-client-id
COGNITO_CLIENT_SECRET=test-secret
```

### Mocking en Tests
```typescript
// Mockear CognitoService en tus tests
jest.mock('../services/CognitoService');
```

## 🆘 Troubleshooting

### Error: "COGNITO_USER_POOL_ID y COGNITO_CLIENT_ID son requeridos"
- Verifica que las variables estén en tu archivo `.env`
- Reinicia el servidor después de agregar las variables

### Error: "Token inválido"
- Verifica que el token sea el `accessToken` (no el `idToken`)
- Verifica que el token no haya expirado (1 hora)
- Verifica que el `User Pool ID` y `Client ID` coincidan

### Error: "Usuario no confirmado"
- El usuario debe confirmar su email después de registrarse
- Usa el endpoint `/users/confirm` con el código recibido por email

### Error: "NotAuthorizedException"
- Credenciales incorrectas
- Usuario deshabilitado en Cognito
- Contraseña incorrecta

## 📚 Recursos Adicionales

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Cognito Identity SDK](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)
- [AWS JWT Verify](https://github.com/awslabs/aws-jwt-verify)
- [Cognito Pricing](https://aws.amazon.com/cognito/pricing/)

## 📞 Soporte

Si tienes problemas con la migración:
1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Consulta la documentación de AWS Cognito
4. Verifica que el User Pool y App Client estén configurados correctamente

