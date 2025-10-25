# 📬 Actualización de Colección Postman - Historial de Predicciones

## 🆕 Nueva Carpeta: "Prediction History"

Se agregó una nueva carpeta con **9 endpoints** para la gestión completa del historial de predicciones.

### 📋 Endpoints Agregados

#### 1. **GET /predictions** - Listar Todas las Predicciones
```
GET {{base_url}}/predictions
Authorization: Bearer {{access_token}}
```
- Obtiene todas las predicciones del usuario autenticado
- Ordenadas por fecha (más recientes primero)
- Retorna array de predicciones con total

#### 2. **GET /predictions?filters** - Listar con Filtros
```
GET {{base_url}}/predictions?barrio=Palermo&dormitorios=2&status=success&isFavorite=true
Authorization: Bearer {{access_token}}
```
**Query Parameters disponibles:**
- `barrio` - Filtrar por barrio
- `dormitorios` - Filtrar por cantidad de dormitorios  
- `status` - success, error, pending
- `isFavorite` - true/false (solo favoritas)
- `dateFrom` - Fecha desde (ISO format)
- `dateTo` - Fecha hasta (ISO format)
- `minPrecio` - Precio mínimo
- `maxPrecio` - Precio máximo

#### 3. **GET /predictions/recent?limit=5** - Predicciones Recientes
```
GET {{base_url}}/predictions/recent?limit=5
Authorization: Bearer {{access_token}}
```
- Obtiene las predicciones más recientes
- Por defecto: 10, máximo: 50
- Útil para dashboards y vistas resumidas

#### 4. **GET /predictions/favorites** - Solo Favoritas
```
GET {{base_url}}/predictions/favorites
Authorization: Bearer {{access_token}}
```
- Obtiene solo las predicciones marcadas como favoritas
- Útil para vista de "guardadas"

#### 5. **GET /predictions/statistics** - Estadísticas
```
GET {{base_url}}/predictions/statistics
Authorization: Bearer {{access_token}}
```
**Retorna:**
```json
{
  "success": true,
  "statistics": {
    "total": 45,
    "successful": 42,
    "failed": 3,
    "favorites": 8,
    "averagePrice": 110500
  }
}
```

#### 6. **GET /predictions/:id** - Detalle de Predicción
```
GET {{base_url}}/predictions/{{prediction_id}}
Authorization: Bearer {{access_token}}
```
- Obtiene una predicción específica por ID
- El usuario solo puede ver sus propias predicciones
- Admins pueden ver todas

#### 7. **PUT /predictions/:id/favorite** - Marcar/Desmarcar Favorita
```
PUT {{base_url}}/predictions/{{prediction_id}}/favorite
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "isFavorite": true
}
```
- Marca o desmarca una predicción como favorita
- Retorna la predicción actualizada

#### 8. **PUT /predictions/:id/notes** - Actualizar Notas
```
PUT {{base_url}}/predictions/{{prediction_id}}/notes
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "userNotes": "Esta consulta es para el departamento de Av. Santa Fe 2500. Precio acorde con la zona."
}
```
- Permite al usuario agregar/editar notas personales
- Útil para recordar contexto de cada consulta

#### 9. **DELETE /predictions/:id** - Eliminar Predicción
```
DELETE {{base_url}}/predictions/{{prediction_id}}
Authorization: Bearer {{access_token}}
```
- Elimina permanentemente una predicción
- Solo el propietario (o admin) puede eliminar
- No hay recuperación después de eliminar

---

## 🔄 Endpoint Actualizado: "Predict Rent"

### Cambios en POST /rent/predict

#### Header de Autorización Opcional
```
Authorization: Bearer {{access_token}}  (OPCIONAL)
```
- **Sin token:** Predicción funciona normalmente, sin guardar historial
- **Con token:** Predicción + guardado automático en historial

#### Nuevos Campos en Request Body
```json
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

**Campos en español (preferidos):**
- `barrio` - Barrio
- `ambientes` - Cantidad de ambientes
- `metrosCuadradosMin` - Metros cuadrados cota inferior
- `metrosCuadradosMax` - Metros cuadrados cota superior
- `dormitorios` - Cantidad de dormitorios
- `banos` - Cantidad de baños
- `garajes` - Cantidad de garajes
- `antiguedad` - Antigüedad en años
- `calle` - Nombre de la calle

**También acepta campos en inglés** (compatibilidad):
- `neighborhood`, `rooms`, `surface_min`, `surface_max`, `bedrooms`, `bathrooms`, `garages`, `age`, `street`

#### Nueva Respuesta con predictionId
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
  "predictionId": "abc-123-def-456"  // ← NUEVO
}
```

#### Test Automático
```javascript
// Guarda predictionId en variable de entorno automáticamente
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    if (responseJson.predictionId) {
        pm.environment.set('prediction_id', responseJson.predictionId);
    }
}
```

---

## 🔧 Nueva Variable de Colección

### `prediction_id`
```
Tipo: string
Descripción: ID de la predicción (obtenido después de hacer una predicción)
```

Se guarda automáticamente cuando haces una predicción autenticada y se usa en:
- GET /predictions/{{prediction_id}}
- PUT /predictions/{{prediction_id}}/favorite
- PUT /predictions/{{prediction_id}}/notes
- DELETE /predictions/{{prediction_id}}

---

## 📊 Estructura de la Colección

```
Observatorio Inmobiliario API - AWS Cognito
├── Authentication (6 endpoints)
│   ├── Register User
│   ├── Confirm Registration
│   ├── Login User
│   ├── Forgot Password
│   ├── Confirm Forgot Password
│   └── Validate Token
│   └── Logout
├── User Profile Management (3 endpoints)
│   ├── Get Profile
│   ├── Update Profile
│   └── Change Password
├── User Administration (4 endpoints - Admin only)
│   ├── Get All Users
│   ├── Get User By Username
│   ├── Update User By Username
│   └── Disable User
├── Prediction History (9 endpoints) ✨ NUEVO
│   ├── Get User Predictions
│   ├── Get User Predictions (Filtered)
│   ├── Get Recent Predictions
│   ├── Get Favorite Predictions
│   ├── Get Prediction Statistics
│   ├── Get Prediction By ID
│   ├── Toggle Favorite
│   ├── Update Notes
│   └── Delete Prediction
└── Rent Management (2 endpoints)
    ├── Rent Index
    └── Predict Rent ⚡ ACTUALIZADO
```

---

## 🚀 Flujo de Uso Recomendado

### 1️⃣ Primera Vez
```
1. Register User → Confirm Registration
2. Login User (guarda access_token)
3. Predict Rent (con token, guarda prediction_id)
4. Get User Predictions (ver historial)
```

### 2️⃣ Consulta Nueva
```
1. (Ya autenticado con access_token)
2. Predict Rent → Guarda automáticamente
3. Get Recent Predictions → Ver últimas 5
```

### 3️⃣ Gestión de Favoritas
```
1. Get User Predictions (buscar consulta interesante)
2. Toggle Favorite (marcar como favorita)
3. Update Notes (agregar comentarios)
4. Get Favorite Predictions (ver todas las favoritas)
```

### 4️⃣ Análisis y Estadísticas
```
1. Get Prediction Statistics → Ver resumen general
2. Get User Predictions (Filtered) → Filtrar por barrio/dormitorios
3. Comparar precios entre diferentes zonas
```

### 5️⃣ Limpieza
```
1. Get User Predictions → Ver todas
2. Delete Prediction → Eliminar las que no necesito
```

---

## 🧪 Tests Automáticos

Todos los endpoints incluyen tests automáticos que verifican:

✅ Status code correcto (200, 201, etc.)  
✅ Response tiene estructura esperada  
✅ Campos requeridos están presentes  
✅ Tipos de datos son correctos  
✅ Variables de entorno se guardan automáticamente

### Ejemplo de Test
```javascript
pm.test('Response contains predictions array', function () {
    const responseJson = pm.response.json();
    pm.expect(responseJson.success).to.be.true;
    pm.expect(responseJson.predictions).to.be.an('array');
    pm.expect(responseJson.total).to.be.a('number');
});
```

---

## 📝 Notas Importantes

### Autenticación
- Todos los endpoints de `/predictions` requieren token de Cognito
- El endpoint `/rent/predict` funciona con o sin token:
  - **Sin token:** Solo predicción, no guarda historial
  - **Con token:** Predicción + historial automático

### Ownership
- Los usuarios solo pueden ver/editar/eliminar sus propias predicciones
- Los admins pueden ver todas las predicciones

### Límites
- Recent Predictions: máximo 50 resultados
- Filtros múltiples se pueden combinar

### Mapeo de Campos
El sistema acepta campos en español o inglés para compatibilidad:
```
barrio ← barrio || neighborhood
dormitorios ← dormitorios || bedrooms
banos ← banos || bathrooms
// etc.
```

---

## 🔗 Importar Colección

1. Abre Postman
2. Click en "Import"
3. Selecciona `Observatorio_Inmobiliario_API.postman_collection.json`
4. Click "Import"

**Configurar Environment:**
```json
{
  "base_url": "http://localhost:9000",
  "access_token": "",
  "prediction_id": ""
}
```

Las variables `access_token` y `prediction_id` se guardarán automáticamente al hacer Login y Predict.

---

## 📚 Referencias

- [Estructura de Campos de Predicción](./RENT_PREDICTION_FIELDS.md)
- [Documentación de Historial](./RENT_PREDICTIONS_HISTORY.md)
- [Entidad RentPrediction](../src/entities/RentPrediction.entity.ts)
- [Controlador](../src/controllers/RentPredictionController.ts)

---

✅ **Colección actualizada con 9 nuevos endpoints para historial de predicciones!**

