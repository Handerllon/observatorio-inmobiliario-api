# ⚡ Configuración AWS Lambda para Predicciones

## 📋 Descripción

El sistema de predicción de rentas ahora utiliza **AWS Lambda** en lugar de ejecutar scripts Python localmente. Esto proporciona:

- ✅ **Escalabilidad automática**: Lambda escala según la demanda
- ✅ **Menor latencia**: No hay cold start de Python en el servidor
- ✅ **Desacoplamiento**: El servicio ML está separado de la API
- ✅ **Mantenimiento simplificado**: Actualizaciones independientes
- ✅ **Costos optimizados**: Solo pagas por las invocaciones

---

## 🔧 Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```bash
# AWS Configuration (compartida con Cognito)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# AWS Lambda Configuration
LAMBDA_PREDICTION_FUNCTION_NAME=rent-prediction-function
```

### 2. Credenciales de AWS

#### Opción A: Usuario IAM (Recomendado para desarrollo)

1. **Crear usuario IAM:**
   - Ve a AWS Console → IAM → Users → Add User
   - Nombre: `observatorio-api-user`
   - Access type: ✅ Programmatic access

2. **Adjuntar permisos:**
   - Crear política personalizada o usar `AWSLambdaRole`
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "lambda:InvokeFunction"
         ],
         "Resource": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:rent-prediction-function"
       }
     ]
   }
   ```

3. **Obtener credenciales:**
   - Copia `Access Key ID` → `AWS_ACCESS_KEY_ID`
   - Copia `Secret Access Key` → `AWS_SECRET_ACCESS_KEY`

#### Opción B: IAM Role (Recomendado para producción - EC2/ECS)

Si ejecutas la API en EC2 o ECS, puedes usar IAM Roles en lugar de credenciales:

```typescript
// En RentService.ts, el constructor puede detectar automáticamente el role:
this.lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "us-east-1",
  // No especificar credentials → usa el IAM role de la instancia
});
```

---

## 🏗️ Crear la Función Lambda

### Paso 1: Preparar el Código Python

La Lambda debe recibir el payload con los parámetros de predicción y retornar el resultado.

**Ejemplo de `lambda_function.py`:**

```python
import json
import numpy as np
import pandas as pd
# Importar tu modelo de ML aquí

def lambda_handler(event, context):
    """
    Handler principal de la función Lambda
    """
    try:
        # Extraer body del evento
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)
        
        # Extraer parámetros
        barrio = body.get('barrio')
        ambientes = body.get('ambientes')
        metros_min = body.get('metrosCuadradosMin')
        metros_max = body.get('metrosCuadradosMax')
        dormitorios = body.get('dormitorios')
        banos = body.get('banos')
        garajes = body.get('garajes')
        antiguedad = body.get('antiguedad')
        calle = body.get('calle')
        
        # ========== TU LÓGICA DE PREDICCIÓN AQUÍ ==========
        # Ejemplo simplificado:
        resultado = realizar_prediccion(
            barrio=barrio,
            ambientes=ambientes,
            metros_min=metros_min,
            metros_max=metros_max,
            dormitorios=dormitorios,
            banos=banos,
            garajes=garajes,
            antiguedad=antiguedad,
            calle=calle
        )
        # ==================================================
        
        # Retornar resultado en formato esperado
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'inmuebles_disponibles': resultado['inmuebles_disponibles'],
                'publicaciones_removidas': resultado['publicaciones_removidas'],
                'publicaciones_nuevas': resultado['publicaciones_nuevas'],
                'precio_cota_inferior': resultado['precio_min'],
                'precio_cota_superior': resultado['precio_max'],
                'moneda': 'ARS'
            })
        }
        
    except Exception as e:
        print(f"Error en predicción: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'message': 'Error al ejecutar predicción'
            })
        }

def realizar_prediccion(**params):
    """
    Tu lógica de ML aquí - Ejemplo placeholder
    """
    # Aquí va tu modelo de ML
    # model = load_model()
    # prediction = model.predict(params)
    
    # Por ahora, retornamos valores de ejemplo:
    return {
        'inmuebles_disponibles': 45,
        'publicaciones_removidas': 3,
        'publicaciones_nuevas': 8,
        'precio_min': 95000,
        'precio_max': 125000
    }
```

### Paso 2: Crear Lambda en AWS Console

1. **Ir a Lambda Console:**
   - AWS Console → Lambda → Create function

2. **Configuración básica:**
   - Function name: `rent-prediction-function`
   - Runtime: `Python 3.11` (o la versión que uses)
   - Architecture: `x86_64`

3. **Permisos:**
   - Create a new role with basic Lambda permissions

4. **Subir código:**
   - Option 1: Copiar/pegar el código en el editor inline
   - Option 2: Subir .zip con dependencias (si usas libraries como scikit-learn)
   - Option 3: Usar contenedor Docker (para modelos grandes)

5. **Configuración avanzada:**
   - Memory: 512 MB - 1024 MB (ajustar según modelo)
   - Timeout: 30 segundos - 5 minutos (ajustar según procesamiento)
   - Environment variables: Si necesitas configuración adicional

### Paso 3: Subir Dependencias (si es necesario)

Si tu modelo requiere bibliotecas como `scikit-learn`, `pandas`, etc.:

```bash
# 1. Crear carpeta de deployment
mkdir lambda_deployment
cd lambda_deployment

# 2. Instalar dependencias en una carpeta
pip install -t ./package numpy pandas scikit-learn

# 3. Copiar tu código
cp ../lambda_function.py ./package/
cp -r ../tu_modelo/ ./package/

# 4. Crear .zip
cd package
zip -r ../lambda_function.zip .

# 5. Subir a Lambda
aws lambda update-function-code \
  --function-name rent-prediction-function \
  --zip-file fileb://../lambda_function.zip
```

### Paso 4: Probar Lambda

En la consola de Lambda:

```json
{
  "body": "{\"barrio\": \"Palermo\", \"ambientes\": 3, \"dormitorios\": 2, \"banos\": 1}"
}
```

Respuesta esperada:
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"inmuebles_disponibles\": 45, \"precio_cota_inferior\": 95000, ...}"
}
```

---

## 🧪 Testing

### Probar desde la API

```bash
# 1. Configurar variables de entorno
cp .env_example .env
# Editar .env con tus credenciales

# 2. Iniciar servidor
npm run dev

# 3. Hacer request de predicción
curl -X POST http://localhost:9000/rent/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "barrio": "Palermo",
    "ambientes": 3,
    "metrosCuadradosMin": 50,
    "metrosCuadradosMax": 80,
    "dormitorios": 2,
    "banos": 1,
    "garajes": 1,
    "antiguedad": 5,
    "calle": "Av. Santa Fe"
  }'
```

### Validar Configuración

El servicio incluye un método de validación:

```typescript
import { RentService } from './services/RentService';

const service = new RentService();
const validation = service.validateConfiguration();

if (!validation.isValid) {
  console.error('Errores de configuración:', validation.errors);
  // ['AWS_REGION no está configurado', ...]
}
```

---

## 🔍 Logs y Debugging

### Ver Logs en CloudWatch

```bash
# Buscar logs de la Lambda
aws logs tail /aws/lambda/rent-prediction-function --follow

# Filtrar errores
aws logs filter-events \
  --log-group-name /aws/lambda/rent-prediction-function \
  --filter-pattern "ERROR"
```

### Logs en la API

El servicio imprime logs detallados:

```
🚀 Invocando Lambda: rent-prediction-function
📦 Payload: { "barrio": "Palermo", ... }
✅ Respuesta de Lambda: { "statusCode": 200, ... }
```

O en caso de error:
```
❌ Error ejecutando predicción con Lambda: Lambda function 'rent-prediction-function' no encontrada
```

---

## 🚀 Formato de Payload

### Request (Node.js → Lambda)

```json
{
  "body": "{\"barrio\":\"Palermo\",\"ambientes\":3,\"dormitorios\":2}",
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

### Response (Lambda → Node.js)

#### Formato API Gateway (Recomendado):
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"inmuebles_disponibles\":45,\"precio_cota_inferior\":95000}"
}
```

#### Formato Directo (También soportado):
```json
{
  "inmuebles_disponibles": 45,
  "publicaciones_removidas": 3,
  "precio_cota_inferior": 95000,
  "precio_cota_superior": 125000
}
```

El servicio detecta automáticamente el formato y lo procesa correctamente.

---

## 🔒 Seguridad

### Recomendaciones

1. **No hardcodear credenciales:**
   ```typescript
   // ❌ MAL
   const credentials = {
     accessKeyId: "AKIAIOSFODNN7EXAMPLE",
     secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
   };

   // ✅ BIEN
   const credentials = {
     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
   };
   ```

2. **Usar IAM Roles en producción:** En lugar de credenciales estáticas

3. **Principio de mínimo privilegio:**
   ```json
   {
     "Effect": "Allow",
     "Action": "lambda:InvokeFunction",
     "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:rent-prediction-function"
   }
   ```

4. **Rotar credenciales regularmente** (si usas IAM User)

5. **Usar AWS Secrets Manager** para credenciales sensibles (opcional)

---

## 💰 Costos

### AWS Lambda Pricing (us-east-1)

- **Requests:** $0.20 por 1 millón de requests
- **Duration:** $0.0000166667 por GB-segundo

**Ejemplo:**
- 10,000 predicciones/mes
- 512 MB de memoria
- 2 segundos por predicción

**Costo mensual:** ~$0.17 USD

Lambda incluye **1 millón de requests gratis** y **400,000 GB-segundos gratis** por mes en el free tier.

---

## 🔄 Migración desde Script Local

### Comparación

| Aspecto | Script Local (Python) | AWS Lambda |
|---------|----------------------|------------|
| **Latencia** | ~3-5 segundos | ~1-2 segundos |
| **Escalabilidad** | 1 request a la vez | Miles concurrentes |
| **Mantenimiento** | Servidor único | Managed service |
| **Costos** | Servidor siempre corriendo | Pay-per-use |
| **Deployment** | Manual | CI/CD automatizado |

### Pasos de Migración

1. ✅ Instalar `@aws-sdk/client-lambda`
2. ✅ Actualizar `RentService.ts`
3. ✅ Configurar variables de entorno
4. ⬜ Migrar script Python a Lambda
5. ⬜ Probar invocación
6. ⬜ Desplegar a producción

---

## 🐛 Troubleshooting

### Error: "Lambda function not found"

```bash
# Verificar que existe
aws lambda get-function --function-name rent-prediction-function

# Verificar región
echo $AWS_REGION
```

### Error: "Credentials invalid"

```bash
# Probar credenciales
aws sts get-caller-identity
```

### Error: "Timeout"

Aumentar timeout en Lambda:
```bash
aws lambda update-function-configuration \
  --function-name rent-prediction-function \
  --timeout 60
```

### Lambda retorna error 500

Revisar logs en CloudWatch:
```bash
aws logs tail /aws/lambda/rent-prediction-function --follow
```

---

## 📚 Referencias

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Servicio RentService](../src/services/RentService.ts)

---

✅ **Migración completada! Tu API ahora usa AWS Lambda para predicciones escalables.**

