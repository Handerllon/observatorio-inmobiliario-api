# 📊 Historial de Predicciones de Alquiler

## 📋 Descripción

Sistema completo para guardar, gestionar y consultar el historial de predicciones de precios de alquiler realizadas por los usuarios. Cada vez que un usuario realiza una consulta de predicción, se guarda automáticamente en la base de datos.

## 🗄️ Estructura de Datos

### Entidad `RentPrediction`

```typescript
{
  id: string;                    // UUID único
  cognitoSub: string;            // ID del usuario en Cognito
  userEmail: string;             // Email del usuario
  
  // Parámetros de entrada
  propertyType: string;          // tipo de propiedad
  bedrooms: number;              // cantidad de habitaciones
  bathrooms: number;             // cantidad de baños
  surfaceTotal: number;          // superficie total
  surfaceCovered: number;        // superficie cubierta
  neighborhood: string;          // barrio
  city: string;                  // ciudad
  province: string;              // provincia
  amenities: string[];           // amenidades (array)
  latitude: number;              // latitud
  longitude: number;             // longitud
  additionalParams: object;      // parámetros adicionales
  
  // Resultado
  predictedPrice: number;        // precio predicho
  currency: string;              // moneda (default: ARS)
  predictionResult: object;      // resultado completo del ML
  
  // Metadatos
  status: enum;                  // success | error | pending
  errorMessage: string;          // mensaje de error si falla
  executionTimeMs: number;       // tiempo de ejecución
  inputFilePath: string;         // ruta archivo input
  outputFilePath: string;        // ruta archivo output
  
  // Datos del usuario
  userNotes: string;             // notas del usuario
  isFavorite: boolean;           // marcada como favorita
  
  // Timestamps
  createdAt: Date;               // fecha de creación
  updatedAt: Date;               // fecha de actualización
}
```

## 🔧 Configuración de Base de Datos

### Ejecutar Migración

```bash
# Opción 1: Usar el script SQL directamente
psql -U postgres -d observatorio_inmobiliario -f src/migrations/CreateRentPredictionTable.sql

# Opción 2: TypeORM generará la tabla automáticamente (synchronize: true)
npm run start
```

### Verificar Tabla Creada

```sql
-- Ver estructura de la tabla
\d+ rent_predictions

-- Ver índices
SELECT * FROM pg_indexes WHERE tablename = 'rent_predictions';
```

## 🚀 Endpoints Disponibles

### 1. Realizar Predicción (con guardado automático)

**Endpoint:** `POST /rent/predict`  
**Autenticación:** Opcional (si el usuario está autenticado, se guarda el historial)

```bash
curl -X POST http://localhost:9000/rent/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "property_type": "departamento",
    "bedrooms": 2,
    "bathrooms": 1,
    "surface_total": 65,
    "surface_covered": 60,
    "neighborhood": "Palermo",
    "city": "Buenos Aires",
    "province": "Buenos Aires",
    "amenities": ["gym", "pool", "security"]
  }'
```

**Respuesta:**
```json
{
  "result": {
    "predicted_price": 120000,
    "confidence": 0.85,
    ...
  },
  "predictionId": "abc-123-def-456"  // ← ID para consultar después
}
```

### 2. Obtener Historial de Predicciones

**Endpoint:** `GET /predictions`  
**Autenticación:** Requerida

```bash
curl -X GET "http://localhost:9000/predictions" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Con Filtros:**
```bash
curl -X GET "http://localhost:9000/predictions?status=success&propertyType=departamento&city=Buenos%20Aires" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Filtros disponibles:**
- `status`: success, error, pending
- `propertyType`: tipo de propiedad
- `city`: ciudad
- `neighborhood`: barrio
- `isFavorite`: true/false
- `dateFrom`: fecha desde (ISO 8601)
- `dateTo`: fecha hasta (ISO 8601)
- `minPrice`: precio mínimo
- `maxPrice`: precio máximo

**Respuesta:**
```json
{
  "success": true,
  "message": "Predicciones obtenidas exitosamente",
  "predictions": [
    {
      "id": "abc-123",
      "propertyType": "departamento",
      "bedrooms": 2,
      "predictedPrice": 120000,
      "status": "success",
      "isFavorite": false,
      "createdAt": "2025-01-15T10:30:00Z",
      ...
    }
  ],
  "total": 15
}
```

### 3. Obtener Predicciones Recientes

**Endpoint:** `GET /predictions/recent?limit=10`  
**Autenticación:** Requerida

```bash
curl -X GET "http://localhost:9000/predictions/recent?limit=5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Obtener Predicción Específica

**Endpoint:** `GET /predictions/:id`  
**Autenticación:** Requerida

```bash
curl -X GET "http://localhost:9000/predictions/abc-123-def-456" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Obtener Solo Favoritas

**Endpoint:** `GET /predictions/favorites`  
**Autenticación:** Requerida

```bash
curl -X GET "http://localhost:9000/predictions/favorites" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Marcar/Desmarcar como Favorita

**Endpoint:** `POST /predictions/:id/favorite`  
**Autenticación:** Requerida

```bash
curl -X POST "http://localhost:9000/predictions/abc-123/favorite" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Predicción agregada a favoritos",
  "prediction": { ... }
}
```

### 7. Agregar/Actualizar Notas

**Endpoint:** `PUT /predictions/:id/notes`  
**Autenticación:** Requerida

```bash
curl -X PUT "http://localhost:9000/predictions/abc-123/notes" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Esta propiedad está cerca del subte. Negociar precio."
  }'
```

### 8. Eliminar Predicción

**Endpoint:** `DELETE /predictions/:id`  
**Autenticación:** Requerida

```bash
curl -X DELETE "http://localhost:9000/predictions/abc-123" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 9. Obtener Estadísticas del Usuario

**Endpoint:** `GET /predictions/statistics`  
**Autenticación:** Requerida

```bash
curl -X GET "http://localhost:9000/predictions/statistics" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "statistics": {
    "total": 45,
    "successful": 42,
    "failed": 3,
    "favorites": 8,
    "averagePrice": 125500.50
  }
}
```

## 🔍 Ejemplos de Uso

### Flujo Completo

```typescript
// 1. Usuario hace una predicción
const predictionResponse = await fetch('/rent/predict', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    property_type: 'departamento',
    bedrooms: 2,
    bathrooms: 1,
    surface_total: 65,
    city: 'Buenos Aires',
    neighborhood: 'Palermo'
  })
});

const { result, predictionId } = await predictionResponse.json();
console.log('Precio predicho:', result.predicted_price);
console.log('ID de la predicción:', predictionId);

// 2. Usuario marca como favorita
await fetch(`/predictions/${predictionId}/favorite`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// 3. Usuario agrega notas
await fetch(`/predictions/${predictionId}/notes`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notes: 'Propiedad interesante, revisar en persona'
  })
});

// 4. Usuario consulta su historial
const historyResponse = await fetch('/predictions?isFavorite=true', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const { predictions } = await historyResponse.json();
```

### Filtrar por Rango de Fechas

```bash
# Predicciones del último mes
curl -X GET "http://localhost:9000/predictions?dateFrom=2025-01-01&dateTo=2025-01-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Filtrar por Rango de Precios

```bash
# Predicciones entre $100,000 y $150,000
curl -X GET "http://localhost:9000/predictions?minPrice=100000&maxPrice=150000" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Casos de Uso

### Dashboard del Usuario

```typescript
// Obtener resumen para el dashboard
const [recent, favorites, stats] = await Promise.all([
  fetch('/predictions/recent?limit=5'),
  fetch('/predictions/favorites'),
  fetch('/predictions/statistics')
]);

// Mostrar:
// - Últimas 5 consultas
// - Predicciones favoritas
// - Estadísticas: total, exitosas, fallidas, precio promedio
```

### Comparación de Propiedades

```typescript
// Usuario quiere comparar varias predicciones guardadas
const predictions = await fetch('/predictions?isFavorite=true');

// Comparar precios, ubicaciones, características
predictions.forEach(pred => {
  console.log(`${pred.neighborhood}: $${pred.predictedPrice}`);
});
```

### Regenerar Predicción

```typescript
// Usuario quiere volver a calcular con los mismos parámetros
const oldPrediction = await fetch(`/predictions/${id}`);
const { additionalParams } = await oldPrediction.json();

// Usar los mismos parámetros para nueva predicción
const newPrediction = await fetch('/rent/predict', {
  method: 'POST',
  body: JSON.stringify(additionalParams)
});
```

### Exportar Historial

```typescript
// Usuario quiere exportar su historial
const allPredictions = await fetch('/predictions');
const { predictions } = await allPredictions.json();

// Convertir a CSV, Excel, PDF, etc.
exportToCSV(predictions);
```

## 🔐 Seguridad y Permisos

### Reglas de Acceso

1. **Predicciones anónimas:** Si el usuario NO está autenticado, la predicción se ejecuta pero NO se guarda.

2. **Predicciones autenticadas:** Si el usuario está autenticado, la predicción se guarda automáticamente.

3. **Acceso al historial:** Solo el usuario propietario puede ver/editar/eliminar sus predicciones.

4. **Validación de ownership:** Todos los endpoints verifican que `cognitoSub` del usuario coincida con el de la predicción.

### Ejemplo de Validación

```typescript
// En el controlador
if (prediction.cognitoSub !== user.sub) {
  return res.status(403).json({
    success: false,
    message: "No tienes permiso para acceder a esta predicción"
  });
}
```

## 📈 Performance y Optimización

### Índices Creados

La tabla tiene índices optimizados para consultas frecuentes:

```sql
-- Búsquedas por usuario
CREATE INDEX idx_rent_predictions_cognito_sub ON rent_predictions("cognitoSub");

-- Ordenamiento por fecha
CREATE INDEX idx_rent_predictions_created_at ON rent_predictions("createdAt");

-- Filtrado por estado
CREATE INDEX idx_rent_predictions_status ON rent_predictions(status);

-- Consultas combinadas usuario + fecha
CREATE INDEX idx_rent_predictions_user_date ON rent_predictions("cognitoSub", "createdAt");

-- Favoritos (índice parcial)
CREATE INDEX idx_rent_predictions_favorite ON rent_predictions("cognitoSub", "isFavorite") 
WHERE "isFavorite" = TRUE;
```

### Límites Recomendados

- Máximo 100 resultados por consulta (usar paginación)
- Cache de 5 minutos para estadísticas
- Eliminar predicciones con más de 1 año automáticamente (opcional)

## 🧪 Testing

### Test de Integración

```typescript
describe('RentPrediction API', () => {
  it('should save prediction when user is authenticated', async () => {
    const response = await request(app)
      .post('/rent/predict')
      .set('Authorization', `Bearer ${token}`)
      .send({
        property_type: 'departamento',
        bedrooms: 2
      });
    
    expect(response.body.predictionId).toBeDefined();
  });
  
  it('should retrieve user predictions', async () => {
    const response = await request(app)
      .get('/predictions')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.body.success).toBe(true);
    expect(response.body.predictions).toBeInstanceOf(Array);
  });
});
```

## 📝 Notas Importantes

1. **Autenticación Opcional en `/rent/predict`:** El endpoint permite usuarios anónimos, pero solo guarda si hay token.

2. **Almacenamiento de Archivos:** Los archivos input/output se guardan en `api_logs/{timestamp}/` y las rutas en la base de datos.

3. **JSON Flexible:** Los campos `additionalParams` y `predictionResult` son JSON, permitiendo almacenar datos adicionales sin cambiar la estructura.

4. **TypeORM Auto-sync:** Con `synchronize: true`, TypeORM crea la tabla automáticamente. En producción, desactivar y usar migraciones.

5. **Soft Delete:** Actualmente es hard delete. Para soft delete, agregar campo `deletedAt` y usar `@DeleteDateColumn()`.

## 🎯 Próximas Mejoras

- [ ] Paginación en endpoints de listado
- [ ] Exportación a CSV/Excel
- [ ] Comparación visual de múltiples predicciones
- [ ] Notificaciones cuando baje el precio
- [ ] Compartir predicciones con otros usuarios
- [ ] Tags/categorías personalizadas
- [ ] Búsqueda por texto en notas

## 📚 Referencias

- [TypeORM Entities](https://typeorm.io/entities)
- [TypeORM Relations](https://typeorm.io/relations)
- [PostgreSQL JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [AWS Cognito Integration](../READMEs/COGNITO_SETUP.md)

---

✅ **Sistema de historial completamente implementado y funcional!**

