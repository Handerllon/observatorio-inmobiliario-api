# 📊 Actualización de Entidad RentPrediction

## 📋 Resumen de Cambios

Se actualizó la entidad `RentPrediction` para persistir **toda la información** retornada por el endpoint de predicción, incluyendo imágenes, métricas y lugares cercanos.

---

## 🔄 Cambios en la Entidad

### ❌ Campos Eliminados

Estos campos ya no se usan, la información ahora viene en el objeto `metrics`:

- `inmueblesDisponibles` (number)
- `publicacionesRemovidas` (number)  
- `publicacionesNuevas` (number)

### ✅ Campos Agregados (JSONB)

#### 1. `images` (Record<string, string>)

**Descripción:** URLs de las 9 imágenes del reporte generadas en S3.

**Estructura:**
```typescript
{
  price_by_m2_evolution: string,
  price_evolution: string,
  bar_price_by_amb: string,
  bar_m2_price_by_amb: string,
  bar_price_by_amb_neighborhood: string,
  bar_m2_price_by_amb_neighborhood: string,
  pie_property_amb_distribution: string,
  pie_property_m2_distribution_neighborhood: string,
  pie_property_amb_distribution_neighborhood: string
}
```

**Ejemplo:**
```json
{
  "price_by_m2_evolution": "https://observatorio...s3.amazonaws.com/.../price_by_m2_evolution.png",
  "price_evolution": "https://observatorio...s3.amazonaws.com/.../price_evolution.png",
  ...
}
```

#### 2. `metrics` (Record<string, any>)

**Descripción:** Métricas estadísticas del barrio obtenidas desde S3 (metrics.json).

**Estructura:**
```typescript
{
  total_properties: number,
  new_properties_since_last_report: number,
  removed_properties_since_last_report: number,
  total_properties_neighborhood: number,
  average_price_neighborhood: string,
  min_price_neighborhood: string,
  max_price_neighborhood: string,
  new_properties_since_last_report_neighborhood: number,
  removed_properties_since_last_report_neighborhood: number
}
```

**Ejemplo:**
```json
{
  "total_properties": 6386,
  "new_properties_since_last_report": 4414,
  "removed_properties_since_last_report": 4499,
  "total_properties_neighborhood": 569,
  "average_price_neighborhood": "649353",
  "min_price_neighborhood": "350000",
  "max_price_neighborhood": "1000000",
  "new_properties_since_last_report_neighborhood": 409,
  "removed_properties_since_last_report_neighborhood": 419
}
```

#### 3. `nearbyPlaces` (Record<string, any>)

**Descripción:** Lugares cercanos obtenidos via Overpass API (OpenStreetMap) en un radio de 500m.

**Estructura:**
```typescript
{
  coordinates: { lat: number, lng: number },
  transporte: Array<NearbyPlace>,
  sitios_interes: Array<NearbyPlace>,
  edificios_administrativos: Array<NearbyPlace>,
  instituciones_educativas: Array<NearbyPlace>,
  centros_salud: Array<NearbyPlace>,
  restaurantes: Array<NearbyPlace>,
  summary: {
    total: number,
    transporte: number,
    sitios_interes: number,
    edificios_administrativos: number,
    instituciones_educativas: number,
    centros_salud: number,
    restaurantes: number
  }
}
```

**Cada lugar (NearbyPlace) tiene:**
```typescript
{
  name: string,
  address: string,
  rating: null,  // OSM no provee ratings
  distance: number,  // metros desde la ubicación
  types: string[],  // categorías OSM
  location: { lat: number, lng: number },
  osm_id: number,  // ID único en OpenStreetMap
  osm_type: string  // "node", "way", o "relation"
}
```

---

## 📁 Archivos Modificados

### 1. `src/entities/RentPrediction.entity.ts`

**Cambios:**
- ❌ Eliminados: `inmueblesDisponibles`, `publicacionesRemovidas`, `publicacionesNuevas`
- ✅ Agregados: `images`, `metrics`, `nearbyPlaces` (todos JSONB)
- ✅ Actualizado método `toJSON()` para retornar formato consistente con API

**Nuevo formato de `toJSON()`:**
```typescript
{
  id: string,
  cognitoSub: string,
  userEmail: string,
  input_data: {
    barrio, ambientes, metrosCuadradosMin, metrosCuadradosMax,
    dormitorios, banos, garajes, antiguedad, calle
  },
  predictionMin: number,
  predictionMax: number,
  moneda: string,
  images: {...},
  metrics: {...},
  nearby_places: {...},
  status: string,
  executionTimeMs: number,
  errorMessage: string | null,
  userNotes: string | null,
  isFavorite: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 2. `src/services/RentPredictionService.ts`

**Cambios en `UpdatePredictionDto`:**
```typescript
export interface UpdatePredictionDto {
  // Campos post-generación (resultados)
  precioCotaInferior?: number;
  precioCotaSuperior?: number;
  moneda?: string;
  // ✅ NUEVOS: Datos adicionales (JSON)
  images?: Record<string, string>;
  metrics?: Record<string, any>;
  nearbyPlaces?: Record<string, any>;
  // Metadatos
  status?: PredictionStatus;
  errorMessage?: string;
  executionTimeMs?: number;
  // Datos del usuario
  userNotes?: string;
  isFavorite?: boolean;
}
```

### 3. `src/controllers/RentController.ts`

**Actualización del guardado:**
```typescript
await RentController.predictionService.updatePrediction(predictionRecord.id, {
  // Guardar resultados de predicción
  precioCotaInferior: predictionResult.predictionMin || predictionResult.prediction,
  precioCotaSuperior: predictionResult.predictionMax || predictionResult.prediction,
  moneda: "ARS",
  // ✅ NUEVO: Guardar datos adicionales (JSON)
  images: predictionResult.images || {},
  metrics: predictionResult.metrics || {},
  nearbyPlaces: nearbyPlaces || {},
  // Metadatos
  status: PredictionStatus.SUCCESS,
  executionTimeMs: executionTimeMs,
});
```

### 4. `src/migrations/AddJsonFieldsToRentPredictions.sql`

**Nueva migración SQL:**
- Elimina campos obsoletos
- Agrega campos JSONB (`images`, `metrics`, `nearbyPlaces`)
- Crea índices GIN para búsquedas eficientes en JSON

---

## 🗄️ Migración de Base de Datos

### Ejecutar Migración

```bash
# Conectar a PostgreSQL
psql -U postgres -d observatorio_inmobiliario

# Ejecutar migración
\i src/migrations/AddJsonFieldsToRentPredictions.sql
```

### Verificar Cambios

```sql
-- Ver estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'rent_predictions' 
ORDER BY ordinal_position;

-- Debe mostrar los nuevos campos:
-- images         | jsonb  | YES
-- metrics        | jsonb  | YES
-- nearbyPlaces   | jsonb  | YES
```

---

## 💾 Ventajas del Uso de JSONB

### 1. Flexibilidad

- No necesitas migración si cambia la estructura interna
- Fácil agregar nuevos campos en `metrics` o `nearby_places`

### 2. Performance

- Índices GIN permiten búsquedas rápidas
- PostgreSQL optimiza consultas sobre JSONB

### 3. Consultas Avanzadas

```sql
-- Buscar predicciones con más de 10 lugares cercanos
SELECT * FROM rent_predictions 
WHERE (nearbyPlaces->'summary'->>'total')::int > 10;

-- Buscar por precio promedio del barrio
SELECT * FROM rent_predictions 
WHERE (metrics->>'average_price_neighborhood')::numeric > 500000;

-- Buscar imágenes disponibles
SELECT id, jsonb_object_keys(images) as image_key 
FROM rent_predictions 
WHERE images IS NOT NULL;
```

---

## 📊 Ejemplo Completo de Registro

```json
{
  "id": "uuid-123",
  "cognitoSub": "user-sub-456",
  "userEmail": "user@example.com",
  "input_data": {
    "barrio": "Belgrano",
    "ambientes": 3,
    "metrosCuadradosMin": 50,
    "metrosCuadradosMax": 80,
    "dormitorios": 2,
    "banos": 1,
    "garajes": 1,
    "antiguedad": 5,
    "calle": "Avenida Cabildo 1873"
  },
  "predictionMin": 707002,
  "predictionMax": 691571,
  "moneda": "ARS",
  "images": {
    "price_by_m2_evolution": "https://...",
    "price_evolution": "https://...",
    ...
  },
  "metrics": {
    "total_properties": 6386,
    "average_price_neighborhood": "649353",
    ...
  },
  "nearby_places": {
    "coordinates": { "lat": -34.564069, "lng": -58.454690 },
    "transporte": [...],
    "summary": { "total": 280 }
  },
  "status": "success",
  "executionTimeMs": 4096,
  "isFavorite": false,
  "createdAt": "2025-10-25T20:47:12.425Z",
  "updatedAt": "2025-10-25T20:47:12.425Z"
}
```

---

## 🔍 Consideraciones

### Tamaño de Datos

- **nearby_places** puede ser grande (100-300 lugares)
- PostgreSQL maneja bien JSONB hasta varios MB por registro
- Los índices GIN mantienen las consultas rápidas

### Backup y Restauración

- JSONB se serializa correctamente en backups
- Formato comprimido automáticamente por PostgreSQL

### Compatibilidad

- PostgreSQL 9.4+ soporta JSONB nativo
- Si usas PostgreSQL < 9.4, usar `JSON` en vez de `JSONB`

---

## ✅ Checklist de Implementación

- [x] Actualizar entidad `RentPrediction`
- [x] Actualizar `UpdatePredictionDto`
- [x] Actualizar `RentController` para guardar nuevos campos
- [x] Crear migración SQL
- [x] Verificar linters (sin errores)
- [ ] **Ejecutar migración en base de datos**
- [ ] **Probar guardado de predicción completa**
- [ ] **Verificar recuperación de predicciones guardadas**

---

## 🚀 Próximos Pasos

1. **Ejecutar migración SQL** en tu base de datos
2. **Probar endpoint** `/api/rent/predict` con usuario autenticado
3. **Verificar guardado** consultando endpoint de historial
4. **Validar que los campos JSON** se persisten correctamente

---

## 📚 Referencias

- **Entidad:** `src/entities/RentPrediction.entity.ts`
- **Service:** `src/services/RentPredictionService.ts`
- **Controller:** `src/controllers/RentController.ts`
- **Migración:** `src/migrations/AddJsonFieldsToRentPredictions.sql`
- **Formato API:** `READMEs/API_RESPONSE_FORMAT.md`

