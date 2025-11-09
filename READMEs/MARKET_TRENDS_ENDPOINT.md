# 📈 Endpoint de Tendencias de Mercado

## Nuevo Endpoint Implementado

Se ha creado un nuevo endpoint público para obtener las tendencias e indicadores del mercado inmobiliario por barrio.

### Endpoint

```
GET /market-trends/:barrio
```

**Características:**
- ✅ Endpoint **público** (no requiere autenticación)
- ✅ Obtiene datos automáticamente del mes actual
- ✅ Datos almacenados en S3
- ✅ Case-insensitive (acepta cualquier capitalización del barrio)

## Uso

### Request

```bash
GET /market-trends/Palermo
```

**Path Parameters:**
- `barrio` (requerido): Nombre del barrio

**Barrios Soportados:**
- Almagro, Balvanera, Belgrano, Caballito, Colegiales, Devoto
- Flores, Monserrat, Núñez, Palermo, Parque Patricios, Puerto Madero
- Recoleta, Retiro, San Nicolas, San Telmo, Villa Crespo
- Villa del Parque, Villa Urquiza

### Response Exitosa (200 OK)

```json
{
  "success": true,
  "message": "Tendencias de mercado obtenidas exitosamente",
  "barrio": "Palermo",
  "data": {
    // Contenido del archivo market_trends.json
    // La estructura depende de lo que contenga el archivo en S3
  }
}
```

### Response - No Encontrado (404 Not Found)

```json
{
  "success": false,
  "message": "No se encontraron tendencias de mercado para el barrio Palermo",
  "barrio": "Palermo"
}
```

**Nota:** Este error es normal si el archivo aún no existe en S3 para el mes actual.

### Response - Bad Request (400)

```json
{
  "success": false,
  "message": "El parámetro 'barrio' es requerido"
}
```

### Response - Error del Servidor (500)

```json
{
  "success": false,
  "message": "Error interno del servidor al obtener tendencias de mercado"
}
```

## Fuente de Datos

### Ubicación en S3

```
reporting/trends/<MM_YYYY>/<BARRIO>/market_trends.json
```

**Ejemplo:**
```
reporting/trends/11_2025/PALERMO/market_trends.json
```

### Formato de Fecha

- `MM`: Mes con cero a la izquierda (01-12)
- `YYYY`: Año de 4 dígitos

### Normalización de Barrio

Los nombres de barrios se normalizan automáticamente:
- Se convierten a mayúsculas
- Se eliminan espacios extra
- Se eliminan acentos

**Ejemplos de normalización:**
- `"Palermo"` → `"PALERMO"`
- `"villa crespo"` → `"VILLA CRESPO"`
- `"Núñez"` → `"NUNEZ"`
- `"san telmo"` → `"SAN TELMO"`

## Ejemplos de Uso

### Con curl

```bash
# Básico
curl http://localhost:9000/market-trends/Palermo

# Con formato JSON bonito
curl http://localhost:9000/market-trends/Recoleta | jq

# Case-insensitive
curl http://localhost:9000/market-trends/BELGRANO
curl http://localhost:9000/market-trends/belgrano
curl http://localhost:9000/market-trends/Belgrano
# Todos funcionan igual ✅
```

### Con JavaScript (fetch)

```javascript
// Obtener tendencias de Palermo
fetch('http://localhost:9000/market-trends/Palermo')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Tendencias:', data.data);
    } else {
      console.log('No hay datos:', data.message);
    }
  })
  .catch(error => console.error('Error:', error));
```

### Con Postman

1. Abrir Postman
2. Crear nuevo request: `GET`
3. URL: `{{base_url}}/market-trends/Palermo`
4. Enviar

**Colección de Postman:**
- Ya incluido en la carpeta "Market Trends"
- Incluye tests automáticos
- Ejemplo con barrio "Palermo"

## Arquitectura

### Componentes Creados

1. **AwsAdapter** (`src/utils/AwsAdapter.ts`)
   - Método `getMarketTrends(barrio: string)`
   - Obtiene el JSON desde S3
   - Maneja errores de archivo no encontrado

2. **MarketTrendsController** (`src/controllers/MarketTrendsController.ts`)
   - Método `getTrendsByBarrio(req, res)`
   - Valida parámetros
   - Maneja respuestas HTTP

3. **MarketTrendsRouter** (`src/routes/MarketTrendsRouter.ts`)
   - Define la ruta `GET /market-trends/:barrio`
   - Endpoint público (sin middleware de autenticación)

4. **App.ts** (actualizado)
   - Registra `MarketTrendsRouter`

### Flujo de Ejecución

```
Client Request
    ↓
Express Router (MarketTrendsRouter)
    ↓
MarketTrendsController.getTrendsByBarrio()
    ↓
AwsAdapter.getMarketTrends(barrio)
    ↓
S3 GetObjectCommand
    ↓
Parse JSON
    ↓
Return to Client
```

## Logs

El endpoint genera logs detallados para debugging:

### Logs INFO (LOG_LEVEL=INFO o superior)

```bash
📈 Obteniendo tendencias de mercado para Palermo
✅ Tendencias de mercado obtenidas exitosamente para Palermo
```

```bash
📭 No se encontraron tendencias para Palermo
```

### Logs DEBUG (LOG_LEVEL=DEBUG)

```bash
📈 Buscando tendencias de mercado en S3: s3://bucket-name/reporting/trends/11_2025/PALERMO/market_trends.json
✅ Tendencias de mercado obtenidas exitosamente para Palermo
📊 Tendencias: { ... }
```

### Logs de Error

```bash
⚠️  Petición de tendencias sin barrio especificado
❌ Error al obtener tendencias de mercado: <error details>
```

## Diferencias con Endpoint de Métricas

| Aspecto | Métricas (`/metrics`) | Tendencias (`/market-trends`) |
|---------|----------------------|------------------------------|
| **Path en S3** | `reporting/metrics/<MM_YYYY>/<BARRIO>/metrics.json` | `reporting/trends/<MM_YYYY>/<BARRIO>/market_trends.json` |
| **Uso** | Datos incluidos en predicciones | Endpoint independiente |
| **Autenticación** | N/A (usado internamente) | Público (no requiere) |
| **Propósito** | Métricas actuales del barrio | Tendencias e indicadores de mercado |

## Testing

### Test Suite en Postman

La colección de Postman incluye tests automáticos:

```javascript
// Verifica código de status
pm.test('Status code is 200 or 404', function () {
    pm.expect([200, 404]).to.include(pm.response.code);
});

// Si es exitoso, verifica estructura
if (pm.response.code === 200) {
    pm.test('Response contains market trends data', function () {
        const responseJson = pm.response.json();
        pm.expect(responseJson.success).to.be.true;
        pm.expect(responseJson.data).to.not.be.undefined;
        pm.expect(responseJson.barrio).to.not.be.undefined;
    });
}
```

### Tests Manuales

**Test 1: Barrio Válido con Datos**
```bash
GET /market-trends/Palermo
Expected: 200 OK con datos ✅
```

**Test 2: Barrio Válido sin Datos**
```bash
GET /market-trends/Almagro
Expected: 404 Not Found (si no hay archivo en S3) ✅
```

**Test 3: Barrio con Diferentes Capitalizaciones**
```bash
GET /market-trends/BELGRANO
GET /market-trends/belgrano
GET /market-trends/Belgrano
Expected: Todas funcionan igual ✅
```

**Test 4: Sin Parámetro de Barrio**
```bash
GET /market-trends/
Expected: 404 Not Found (ruta no existe) ✅
```

**Test 5: Barrio con Espacios**
```bash
GET /market-trends/Villa%20Crespo
Expected: 200 OK o 404 (dependiendo de datos) ✅
```

## Mantenimiento

### Actualización de Datos

Los datos se actualizan automáticamente en S3:
1. Scripts de generación de datos deben subir archivos a S3
2. Path: `reporting/trends/<MM_YYYY>/<BARRIO>/market_trends.json`
3. El endpoint siempre busca el mes actual automáticamente

### Agregar Más Barrios

Para soportar nuevos barrios:
1. El endpoint ya soporta cualquier barrio
2. Solo necesitas subir el archivo correspondiente a S3
3. La normalización se hace automáticamente

### Cambiar Estructura del JSON

El endpoint devuelve el JSON tal como está en S3:
- No hay transformación de datos
- La estructura es flexible
- Puedes cambiar el contenido sin modificar el código

## Seguridad

### Endpoint Público

El endpoint es público porque:
- ✅ Los datos de mercado son información pública
- ✅ No contiene información sensible de usuarios
- ✅ No permite modificaciones
- ✅ Solo lectura de datos agregados

### Validación

El endpoint valida:
- ✅ Que el parámetro `barrio` esté presente
- ✅ Que el bucket de S3 esté configurado
- ✅ Manejo seguro de errores

### Rate Limiting (Recomendado)

Para producción, considera agregar rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const trendsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por IP
});

router.get('/market-trends/:barrio', trendsLimiter, controller.getTrendsByBarrio);
```

## Troubleshooting

### Error: "No se encontraron tendencias"

**Causa:** El archivo no existe en S3 para el mes actual

**Soluciones:**
1. Verificar que el archivo esté en S3: `reporting/trends/<MM_YYYY>/<BARRIO>/market_trends.json`
2. Verificar el formato de fecha (MM_YYYY)
3. Verificar la normalización del nombre del barrio (mayúsculas, sin acentos)
4. Generar el archivo si falta

### Error: "BUCKET_NAME no está configurado"

**Causa:** Variable de entorno `BUCKET_NAME` no está definida

**Solución:**
```bash
# En .env
BUCKET_NAME=your-bucket-name
```

### Error 500: "Error interno del servidor"

**Causa:** Error en AWS credentials o permisos de S3

**Soluciones:**
1. Verificar AWS credentials en `.env`:
   ```bash
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_REGION=us-east-1
   ```
2. Verificar permisos de S3 (GetObject)
3. Ver logs detallados con `LOG_LEVEL=DEBUG`

## Archivos Modificados/Creados

### Nuevos Archivos

1. ✅ `src/controllers/MarketTrendsController.ts` - Controller del endpoint
2. ✅ `src/routes/MarketTrendsRouter.ts` - Router del endpoint

### Archivos Modificados

1. ✅ `src/utils/AwsAdapter.ts` - Añadido método `getMarketTrends()`
2. ✅ `src/App.ts` - Registrado `MarketTrendsRouter`
3. ✅ `Observatorio_Inmobiliario_API.postman_collection.json` - Añadida carpeta "Market Trends"

## Referencias

- Endpoint de métricas existente: `getNeighborhoodMetrics()` en `AwsAdapter`
- Normalización de barrios: `normalizeBarrioName()` en `AwsAdapter`
- Documentación de AWS S3: [GetObject API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)

