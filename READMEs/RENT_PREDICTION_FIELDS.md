# 📋 Estructura de la Entidad RentPrediction

## 📊 Campos de la Entidad

### 🔐 Tracking de Usuario

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único de la predicción |
| `cognitoSub` | VARCHAR(255) | ID único del usuario en AWS Cognito |
| `userEmail` | VARCHAR(255) | Email del usuario (opcional) |

### 📝 Campos Pre-Generación (Input)

Campos que el usuario proporciona **antes** de ejecutar la predicción:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `barrio` | VARCHAR(255) | No | Barrio donde se busca la propiedad |
| `ambientes` | INTEGER | No | Cantidad de ambientes totales |
| `metrosCuadradosMin` | DECIMAL(10,2) | No | Metros cuadrados - cota inferior |
| `metrosCuadradosMax` | DECIMAL(10,2) | No | Metros cuadrados - cota superior |
| `dormitorios` | INTEGER | No | Cantidad de dormitorios |
| `banos` | INTEGER | No | Cantidad de baños |
| `garajes` | INTEGER | No | Cantidad de garajes/cocheras |
| `antiguedad` | INTEGER | No | Antigüedad de la propiedad (años) |
| `calle` | VARCHAR(255) | No | Nombre de la calle |

### 📊 Campos Post-Generación (Resultados)

Campos que se completan **después** de ejecutar la predicción con ML:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `inmueblesDisponibles` | INTEGER | Cantidad de inmuebles disponibles encontrados |
| `publicacionesRemovidas` | INTEGER | Cantidad de publicaciones removidas del análisis |
| `publicacionesNuevas` | INTEGER | Cantidad de publicaciones nuevas detectadas |
| `precioCotaInferior` | DECIMAL(12,2) | Precio mínimo del rango predicho |
| `precioCotaSuperior` | DECIMAL(12,2) | Precio máximo del rango predicho |
| `moneda` | VARCHAR(10) | Moneda del precio (default: "ARS") |

### ⚙️ Metadatos de la Predicción

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | ENUM | Estado: `success`, `error`, `pending` |
| `errorMessage` | TEXT | Mensaje de error si la predicción falló |
| `executionTimeMs` | INTEGER | Tiempo de ejecución en milisegundos |

### 👤 Datos del Usuario

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `userNotes` | TEXT | Notas personalizadas del usuario |
| `isFavorite` | BOOLEAN | Marca si está guardada como favorita |

### 📅 Timestamps

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `createdAt` | TIMESTAMP | Fecha y hora de creación |
| `updatedAt` | TIMESTAMP | Fecha y hora de última actualización |

## 🔄 Ejemplo de Flujo

### 1. Crear Predicción (Pre-Generación)

```json
POST /rent/predict
Authorization: Bearer <token>

{
  "barrio": "Palermo",
  "ambientes": 3,
  "metrosCuadradosMin": 50,
  "metrosCuadradosMax": 80,
  "dormitorios": 2,
  "banos": 1,
  "garajes": 1,
  "antiguedad": 5,
  "calle": "Av. Santa Fe"
}
```

**Campos guardados:**
```javascript
{
  id: "uuid-generado",
  cognitoSub: "user-cognito-id",
  userEmail: "user@example.com",
  // Campos input
  barrio: "Palermo",
  ambientes: 3,
  metrosCuadradosMin: 50,
  metrosCuadradosMax: 80,
  dormitorios: 2,
  banos: 1,
  garajes: 1,
  antiguedad: 5,
  calle: "Av. Santa Fe",
  // Estado inicial
  status: "pending",
  createdAt: "2025-01-23T10:00:00Z"
}
```

### 2. Actualizar con Resultados (Post-Generación)

Después de ejecutar el modelo ML:

```javascript
{
  // Se mantienen campos input...
  // Se agregan campos output:
  inmueblesDisponibles: 45,
  publicacionesRemovidas: 3,
  publicacionesNuevas: 8,
  precioCotaInferior: 95000,
  precioCotaSuperior: 125000,
  moneda: "ARS",
  status: "success",
  executionTimeMs: 3500,
  updatedAt: "2025-01-23T10:00:03Z"
}
```

### 3. Respuesta al Usuario

```json
{
  "result": {
    "inmuebles_disponibles": 45,
    "publicaciones_removidas": 3,
    "publicaciones_nuevas": 8,
    "precio_cota_inferior": 95000,
    "precio_cota_superior": 125000,
    "moneda": "ARS"
  },
  "predictionId": "uuid-generado"
}
```

## 🔍 Consultas Comunes

### Obtener Historial del Usuario

```bash
GET /predictions
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "predictions": [
    {
      "id": "uuid-1",
      "barrio": "Palermo",
      "ambientes": 3,
      "dormitorios": 2,
      "precioCotaInferior": 95000,
      "precioCotaSuperior": 125000,
      "status": "success",
      "isFavorite": false,
      "createdAt": "2025-01-23T10:00:00Z"
    }
  ],
  "total": 1
}
```

### Filtrar por Barrio

```bash
GET /predictions?barrio=Palermo
Authorization: Bearer <token>
```

### Filtrar por Dormitorios

```bash
GET /predictions?dormitorios=2
Authorization: Bearer <token>
```

### Filtrar por Rango de Precios

```bash
GET /predictions?minPrecio=80000&maxPrecio=150000
Authorization: Bearer <token>
```

## 📝 Mapeo de Campos (Request → Database)

El sistema acepta múltiples formatos en el request y los mapea automáticamente:

### Campos de Entrada (Pre-Generación)

```typescript
// El sistema acepta ambos formatos:
{
  barrio: "Palermo",           // ← Preferido (español)
  neighborhood: "Palermo"      // ← También aceptado (inglés)
}

// Mapeo completo:
barrio          ← req.body.barrio || req.body.neighborhood
ambientes       ← req.body.ambientes || req.body.rooms
metrosCuadradosMin ← req.body.metrosCuadradosMin || req.body.surface_min
metrosCuadradosMax ← req.body.metrosCuadradosMax || req.body.surface_max
dormitorios     ← req.body.dormitorios || req.body.bedrooms
banos           ← req.body.banos || req.body.bathrooms
garajes         ← req.body.garajes || req.body.garages
antiguedad      ← req.body.antiguedad || req.body.age
calle           ← req.body.calle || req.body.street
```

### Campos de Resultado (Post-Generación)

```typescript
// Mapeo desde la respuesta del ML:
inmueblesDisponibles    ← jsonObject.inmuebles_disponibles || jsonObject.available_properties
publicacionesRemovidas  ← jsonObject.publicaciones_removidas || jsonObject.removed_publications
publicacionesNuevas     ← jsonObject.publicaciones_nuevas || jsonObject.new_publications
precioCotaInferior      ← jsonObject.precio_cota_inferior || jsonObject.price_min
precioCotaSuperior      ← jsonObject.precio_cota_superior || jsonObject.price_max
moneda                  ← jsonObject.moneda || jsonObject.currency || "ARS"
```

## 🗄️ Índices de Base de Datos

Para optimizar las consultas, la tabla tiene los siguientes índices:

```sql
idx_rent_predictions_cognito_sub    -- Búsquedas por usuario
idx_rent_predictions_created_at     -- Ordenamiento por fecha
idx_rent_predictions_status         -- Filtrado por estado
idx_rent_predictions_user_date      -- Consultas combinadas usuario+fecha
idx_rent_predictions_favorite       -- Favoritos (índice parcial)
idx_rent_predictions_barrio         -- Búsquedas por barrio
idx_rent_predictions_dormitorios    -- Filtrado por dormitorios
```

## 💡 Casos de Uso

### Dashboard del Usuario

```typescript
// Mostrar últimas 5 predicciones
const recent = await api.get('/predictions/recent?limit=5');

// Mostrar solo favoritas
const favorites = await api.get('/predictions/favorites');

// Estadísticas
const stats = await api.get('/predictions/statistics');
// → { total: 45, successful: 42, failed: 3, favorites: 8, averagePrice: 110500 }
```

### Comparación de Propiedades

```typescript
// Usuario quiere comparar precios en diferentes barrios
const palermo = await api.get('/predictions?barrio=Palermo&dormitorios=2');
const belgrano = await api.get('/predictions?barrio=Belgrano&dormitorios=2');

// Comparar precios promedio
const precioPromedioPalermo = calculateAverage(palermo.predictions);
const precioPromedioBelgrano = calculateAverage(belgrano.predictions);
```

### Regenerar Consulta Anterior

```typescript
// Usuario quiere volver a ejecutar con los mismos parámetros
const oldPrediction = await api.get('/predictions/abc-123');

const newPrediction = await api.post('/rent/predict', {
  barrio: oldPrediction.barrio,
  ambientes: oldPrediction.ambientes,
  metrosCuadradosMin: oldPrediction.metrosCuadradosMin,
  metrosCuadradosMax: oldPrediction.metrosCuadradosMax,
  dormitorios: oldPrediction.dormitorios,
  banos: oldPrediction.banos,
  garajes: oldPrediction.garajes,
  antiguedad: oldPrediction.antiguedad,
  calle: oldPrediction.calle
});
```

## 📊 Estadísticas Calculadas

### Precio Promedio

Se calcula como el promedio entre las cotas inferior y superior de todas las predicciones exitosas:

```typescript
averagePrice = sum((precioCotaInferior + precioCotaSuperior) / 2) / totalPredictions
```

### Ejemplo

```javascript
Predicción 1: Min=90000, Max=110000 → Promedio=100000
Predicción 2: Min=95000, Max=125000 → Promedio=110000
Predicción 3: Min=85000, Max=105000 → Promedio=95000

Precio Promedio Total: (100000 + 110000 + 95000) / 3 = 101666.67
```

## 🔄 Migración de Base de Datos

### Ejecutar Migración

```bash
psql -U postgres -d observatorio_inmobiliario \
  -f src/migrations/CreateRentPredictionTable.sql
```

### Verificar Tabla

```sql
-- Ver estructura
\d+ rent_predictions

-- Ver índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'rent_predictions';

-- Ver comentarios
SELECT column_name, col_description(attrelid, attnum) as description
FROM pg_attribute
JOIN pg_class ON attrelid = pg_class.oid
WHERE relname = 'rent_predictions' AND col_description(attrelid, attnum) IS NOT NULL;
```

## ✅ Validaciones

### En el Backend

1. **Usuario autenticado:** Solo se guarda si hay token válido
2. **Campos opcionales:** Todos los campos de input son opcionales
3. **Tipos de datos:** Se valida el tipo correcto en TypeORM
4. **Ownership:** Solo el propietario puede ver/modificar sus predicciones

### Recomendaciones Frontend

```typescript
// Validar campos antes de enviar
if (metrosCuadradosMin && metrosCuadradosMax) {
  if (metrosCuadradosMin > metrosCuadradosMax) {
    alert('La cota mínima no puede ser mayor que la máxima');
    return;
  }
}

if (antiguedad && antiguedad < 0) {
  alert('La antigüedad no puede ser negativa');
  return;
}
```

## 📚 Referencias

- [Entidad TypeORM](../src/entities/RentPrediction.entity.ts)
- [Servicio](../src/services/RentPredictionService.ts)
- [Controlador](../src/controllers/RentPredictionController.ts)
- [Migración SQL](../src/migrations/CreateRentPredictionTable.sql)

---

✅ **Entidad simplificada y optimizada para el caso de uso específico de predicción de alquileres!**

