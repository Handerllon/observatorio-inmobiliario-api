# 📋 Formato de Respuesta de la API

## 🎯 Overview

La API retorna diferentes formatos de respuesta dependiendo de si se proporcionan valores min/max de metros cuadrados.

---

## 📤 Formato con Min/Max (2 Invocaciones Lambda)

Cuando se envían `metrosCuadradosMin` y `metrosCuadradosMax`, la API invoca Lambda **DOS veces** y combina los resultados.

### Request

```json
{
  "barrio": "Palermo",
  "ambientes": 3,
  "metrosCuadradosMin": 50,
  "metrosCuadradosMax": 80,
  "dormitorios": 2,
  "banos": 1,
  "garajes": 1,
  "antiguedad": 5
}
```

### Response

```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877,
  "images": {
    "price_by_m2_evolution": "https://bucket.s3.us-east-1.amazonaws.com/.../price_by_m2_evolution.png",
    "price_evolution": "https://bucket.s3.us-east-1.amazonaws.com/.../price_evolution.png",
    "bar_price_by_amb": "https://bucket.s3.us-east-1.amazonaws.com/.../bar_price_by_amb.png",
    "bar_m2_price_by_amb": "https://bucket.s3.us-east-1.amazonaws.com/.../bar_m2_price_by_amb.png",
    "bar_price_by_amb_neighborhood": null,
    "bar_m2_price_by_amb_neighborhood": null,
    "pie_property_amb_distribution": "https://bucket.s3.us-east-1.amazonaws.com/.../pie_property_amb_distribution.png",
    "pie_property_m2_distribution_neighborhood": null,
    "pie_property_amb_distribution_neighborhood": null
  },
  "metrics": {
    "precioPromedio": 1050000,
    "precioMediano": 980000,
    "inmueblesDisponibles": 234,
    "tendenciaPrecio": 5.2,
    "ofertaNueva": 45,
    "ofertaRemovida": 32
  },
  "nearby_places": {
    "coordinates": { "lat": -34.5886, "lng": -58.4095 },
    "restaurants": [{"name": "Don Julio", "address": "Guatemala 4699", "rating": 4.6, "distance": 320, "types": ["restaurant"], "location": {"lat": -34.5890, "lng": -58.4105}}],
    "schools": [{"name": "Colegio San Agustín", "address": "Av. Santa Fe 3021", "rating": 4.3, "distance": 150, "types": ["school"], "location": {"lat": -34.5888, "lng": -58.4098}}],
    "parks": [{"name": "Plaza Serrano", "address": "Palermo", "rating": 4.4, "distance": 600, "types": ["park"], "location": {"lat": -34.5898, "lng": -58.4115}}],
    "pharmacies": [],
    "supermarkets": [],
    "banks": [],
    "transports": [{"name": "Estación Palermo", "address": "Av. Santa Fe y Scalabrini Ortiz", "rating": 4.1, "distance": 280, "types": ["transit_station"], "location": {"lat": -34.5889, "lng": -58.4100}}],
    "summary": {"total": 4, "restaurants": 1, "schools": 1, "parks": 1, "pharmacies": 0, "supermarkets": 0, "banks": 0, "transports": 1}
  },
  "input_data": {
    "barrio": "Palermo",
    "ambientes": 3,
    "metrosCuadradosMin": 50,
    "metrosCuadradosMax": 80,
    "totalArea": null,
    "dormitorios": 2,
    "banos": 1,
    "garajes": 1,
    "antiguedad": 5,
    "calle": null,
    "ciudad": null,
    "provincia": null,
    "timestamp": "2025-01-24T15:30:00.000Z"
  }
}
```

---

## 📤 Formato con Valor Único (1 Invocación Lambda)

Cuando se envía solo `total_area` o un valor único, la API invoca Lambda **UNA vez**.

### Request

```json
{
  "barrio": "Palermo",
  "total_area": 65,
  "dormitorios": 2,
  "banos": 1
}
```

### Response

```json
{
  "prediction": 1050124,
  "otros_campos_lambda": "...",
  "images": {
    "price_by_m2_evolution": "https://bucket.s3.us-east-1.amazonaws.com/.../price_by_m2_evolution.png",
    "price_evolution": null,
    "bar_price_by_amb": null,
    "bar_m2_price_by_amb": null,
    "bar_price_by_amb_neighborhood": null,
    "bar_m2_price_by_amb_neighborhood": null,
    "pie_property_amb_distribution": null,
    "pie_property_m2_distribution_neighborhood": null,
    "pie_property_amb_distribution_neighborhood": null
  },
  "metrics": {
    "precioPromedio": 1050000,
    "precioMediano": 980000,
    "inmueblesDisponibles": 234,
    "tendenciaPrecio": 5.2,
    "ofertaNueva": 45,
    "ofertaRemovida": 32
  },
  "input_data": {
    "barrio": "Palermo",
    "ambientes": null,
    "metrosCuadradosMin": null,
    "metrosCuadradosMax": null,
    "totalArea": 65,
    "dormitorios": 2,
    "banos": 1,
    "garajes": null,
    "antiguedad": null,
    "calle": null,
    "ciudad": null,
    "provincia": null,
    "timestamp": "2025-01-24T15:30:00.000Z"
  }
}
```

---

## 📊 Objeto `metrics`

El campo `metrics` contiene estadísticas del barrio obtenidas desde S3. Este campo puede ser `null` si no hay datos disponibles para el período actual.

### Ubicación en S3

```
s3://{BUCKET_NAME}/reporting/metrics/{MM_YYYY}/{BARRIO_NORMALIZADO}/metrics.json
```

**Ejemplo:** `s3://bucket/reporting/metrics/01_2025/PALERMO/metrics.json`

### Estructura

```typescript
{
  metrics: {
    precioPromedio: number,
    precioMediano: number,
    inmueblesDisponibles: number,
    tendenciaPrecio: number,  // Porcentaje (ej: 5.2 = +5.2%)
    ofertaNueva: number,
    ofertaRemovida: number,
    // ... otros campos según el contenido del JSON
  } | null
}
```

### Campos Comunes (Dependen del JSON en S3)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `precioPromedio` | number | Precio promedio de alquiler en el barrio |
| `precioMediano` | number | Precio mediano de alquiler |
| `inmueblesDisponibles` | number | Cantidad de inmuebles disponibles |
| `tendenciaPrecio` | number | Tendencia de precio (% cambio vs mes anterior) |
| `ofertaNueva` | number | Nuevas publicaciones en el período |
| `ofertaRemovida` | number | Publicaciones removidas en el período |

**Nota:** El contenido exacto depende de la estructura del archivo `metrics.json` en S3. Los campos mostrados son ejemplos comunes.

### Comportamiento

✅ **Archivo existe:** Retorna el contenido parseado del JSON  
❌ **Archivo no existe:** Retorna `null` (no es un error)  
❌ **Error de lectura:** Retorna `null` y registra warning en logs  

### Ejemplo de Uso en Frontend

```typescript
// Verificar si hay métricas disponibles
if (response.metrics) {
  console.log(`Precio promedio en ${response.input_data.barrio}: $${response.metrics.precioPromedio}`);
  console.log(`Tendencia: ${response.metrics.tendenciaPrecio > 0 ? '+' : ''}${response.metrics.tendenciaPrecio}%`);
} else {
  console.log('No hay métricas disponibles para este barrio/período');
}
```

### Formato de Fecha

- **Formato:** `MM_YYYY` (ejemplo: `01_2025` para enero 2025)
- **Mes:** Mes actual (basado en fecha del servidor)
- **Año:** Año actual

### Normalización del Barrio

El nombre del barrio se normaliza igual que para las imágenes:
- Mayúsculas: `"Palermo"` → `"PALERMO"`
- Sin acentos: `"Núñez"` → `"NUNEZ"`
- Espacios a guiones bajos: `"Palermo Soho"` → `"PALERMO_SOHO"`
- Sin caracteres especiales

---

## 📍 Objeto `nearby_places`

El campo `nearby_places` contiene lugares cercanos a la ubicación consultada. Usa una arquitectura híbrida:
- **AWS Location Service**: Geocodificación (convertir dirección a coordenadas)
- **Overpass API (OpenStreetMap)**: Búsqueda de lugares cercanos

Este campo siempre está presente pero puede estar vacío si falla la geocodificación.

### Ubicación Base

La ubicación se determina geocodificando con AWS Location Service: `{calle}, {barrio}, Buenos Aires, Argentina`

Luego se buscan lugares cercanos en un **radio de 500 metros** usando Overpass API.

### Estructura

```typescript
{
  nearby_places: {
    coordinates: {
      lat: number,
      lng: number
    } | null,
    restaurants: NearbyPlace[],
    schools: NearbyPlace[],
    parks: NearbyPlace[],
    pharmacies: NearbyPlace[],
    supermarkets: NearbyPlace[],
    banks: NearbyPlace[],
    transports: NearbyPlace[],
    summary: {
      total: number,
      restaurants: number,
      schools: number,
      parks: number,
      pharmacies: number,
      supermarkets: number,
      banks: number,
      transports: number
    }
  }
}

// Estructura de cada lugar
interface NearbyPlace {
  name: string;
  address: string;
  rating: null;           // Overpass/OSM no provee ratings
  distance: number;       // metros desde la ubicación
  types: string[];        // tags de OpenStreetMap
  location: {
    lat: number,
    lng: number
  },
  osm_id: number,        // ID de OpenStreetMap
  osm_type: string       // "node", "way", o "relation"
}
```

### Categorías

| Categoría | Descripción | Límite | Radio |
|-----------|-------------|--------|-------|
| `restaurants` | Restaurantes, cafés, bares | 5 | 500m |
| `schools` | Escuelas, colegios, universidades | 3 | 500m |
| `parks` | Plazas, parques | 3 | 500m |
| `pharmacies` | Farmacias | 3 | 500m |
| `supermarkets` | Supermercados, minimercados | 3 | 500m |
| `banks` | Bancos, cajeros | 3 | 500m |
| `transports` | Estaciones de tren, subte, colectivo | 5 | 500m |

### Comportamiento

✅ **Geocoding exitoso:** Retorna lugares cercanos desde Overpass API  
❌ **Sin barrio:** Retorna estructura vacía  
❌ **Dirección no encontrada:** Retorna estructura vacía  
⚠️ **Place Index no configurado:** Retorna estructura vacía + warning en logs  
❌ **Error de AWS (geocoding):** Retorna estructura vacía  
❌ **Error de Overpass:** Retorna estructura vacía  

**Nota:** OpenStreetMap (Overpass API) no provee ratings, por lo que el campo `rating` siempre es `null`.

### Ejemplo Completo de un Lugar

```json
{
  "name": "La Panadería de Pablo",
  "address": "Av. Santa Fe 1234, Palermo",
  "rating": null,
  "distance": 320,
  "types": ["restaurant", "cafe"],
  "location": {
    "lat": -34.5890,
    "lng": -58.4105
  },
  "osm_id": 123456789,
  "osm_type": "node"
}
```

### Uso en Frontend

```typescript
// Verificar si hay lugares
if (response.nearby_places.summary.total > 0) {
  console.log(`Encontrados ${response.nearby_places.summary.total} lugares`);
  
  // Mostrar restaurantes más cercanos
  response.nearby_places.restaurants
    .sort((a, b) => a.distance - b.distance)
    .forEach(restaurant => {
      console.log(`${restaurant.name} - ${restaurant.distance}m`);
    });
}

// Renderizar en mapa (MapLibre, Leaflet, Google Maps, etc.)
if (response.nearby_places.coordinates) {
  const map = new maplibregl.Map({
    container: 'map',
    center: [response.nearby_places.coordinates.lng, response.nearby_places.coordinates.lat],
    zoom: 15
  });
}

// Link a OpenStreetMap para cada lugar
const osmLink = (place) => {
  return `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`;
};
```

**Ver documentación completa:** `OVERPASS_INTEGRATION.md`

---

## 📝 Objeto `input_data`

El campo `input_data` contiene los parámetros originales del request, normalizados y estructurados. Esto es útil para:

- **Historial de consultas:** Guardar qué parámetros se usaron
- **Re-ejecución:** Poder repetir la consulta con los mismos parámetros
- **Auditoría:** Trazabilidad de las predicciones realizadas
- **Análisis:** Ver qué tipo de consultas hacen los usuarios

### Estructura

```typescript
{
  input_data: {
    barrio: string | null,
    ambientes: number | null,
    metrosCuadradosMin: number | null,
    metrosCuadradosMax: number | null,
    totalArea: number | null,
    dormitorios: number | null,
    banos: number | null,
    garajes: number | null,
    antiguedad: number | null,
    calle: string | null,
    ciudad: string | null,
    provincia: string | null,
    timestamp: string  // ISO 8601 format
  }
}
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `barrio` | string \| null | Barrio de la propiedad |
| `ambientes` | number \| null | Cantidad de ambientes |
| `metrosCuadradosMin` | number \| null | Metros cuadrados mínimos |
| `metrosCuadradosMax` | number \| null | Metros cuadrados máximos |
| `totalArea` | number \| null | Área total (cuando es valor único) |
| `dormitorios` | number \| null | Cantidad de dormitorios |
| `banos` | number \| null | Cantidad de baños |
| `garajes` | number \| null | Cantidad de garajes |
| `antiguedad` | number \| null | Antigüedad en años |
| `calle` | string \| null | Nombre de la calle |
| `ciudad` | string \| null | Ciudad |
| `provincia` | string \| null | Provincia |
| `timestamp` | string | Fecha/hora de la consulta (ISO 8601) |

### Características

✅ **Normalizado:** Siempre usa los mismos nombres de campos (español)  
✅ **Completo:** Incluye todos los campos posibles  
✅ **Con timestamp:** Fecha exacta de la consulta  
✅ **Flexible:** Campos no enviados aparecen como `null`  

---

## 🖼️ Objeto `images`

El campo `images` siempre es un **objeto** con 9 keys predefinidas:

### Estructura

```typescript
{
  images: {
    price_by_m2_evolution: string | null,
    price_evolution: string | null,
    bar_price_by_amb: string | null,
    bar_m2_price_by_amb: string | null,
    bar_price_by_amb_neighborhood: string | null,
    bar_m2_price_by_amb_neighborhood: string | null,
    pie_property_amb_distribution: string | null,
    pie_property_m2_distribution_neighborhood: string | null,
    pie_property_amb_distribution_neighborhood: string | null
  }
}
```

### Descripción de Keys

| Key | Tipo de Gráfico | Descripción |
|-----|----------------|-------------|
| `price_by_m2_evolution` | Línea | Evolución temporal del precio por m² |
| `price_evolution` | Línea | Evolución temporal del precio total |
| `bar_price_by_amb` | Barras | Precio promedio según cantidad de ambientes |
| `bar_m2_price_by_amb` | Barras | Precio por m² según cantidad de ambientes |
| `bar_price_by_amb_neighborhood` | Barras | Comparativa de precio por ambientes entre barrios |
| `bar_m2_price_by_amb_neighborhood` | Barras | Comparativa de precio/m² por ambientes entre barrios |
| `pie_property_amb_distribution` | Torta | Distribución de propiedades por cantidad de ambientes |
| `pie_property_m2_distribution_neighborhood` | Torta | Distribución de m² por barrio |
| `pie_property_amb_distribution_neighborhood` | Torta | Distribución de ambientes por barrio |

### Valores Posibles

- **`string`**: URL completa a la imagen en S3
- **`null`**: La imagen no existe en S3 para ese barrio/mes

---

## 💡 Uso en Frontend

### React/TypeScript Example

```typescript
interface InputData {
  barrio: string | null;
  ambientes: number | null;
  metrosCuadradosMin: number | null;
  metrosCuadradosMax: number | null;
  totalArea: number | null;
  dormitorios: number | null;
  banos: number | null;
  garajes: number | null;
  antiguedad: number | null;
  calle: string | null;
  ciudad: string | null;
  provincia: string | null;
  timestamp: string;
}

interface NeighborhoodMetrics {
  precioPromedio?: number;
  precioMediano?: number;
  inmueblesDisponibles?: number;
  tendenciaPrecio?: number;
  ofertaNueva?: number;
  ofertaRemovida?: number;
  // ... otros campos según el JSON en S3
}

interface PredictionResponse {
  predictionMin?: number;
  predictionMax?: number;
  prediction?: number;
  images: {
    price_by_m2_evolution: string | null;
    price_evolution: string | null;
    bar_price_by_amb: string | null;
    bar_m2_price_by_amb: string | null;
    bar_price_by_amb_neighborhood: string | null;
    bar_m2_price_by_amb_neighborhood: string | null;
    pie_property_amb_distribution: string | null;
    pie_property_m2_distribution_neighborhood: string | null;
    pie_property_amb_distribution_neighborhood: string | null;
  };
  metrics: NeighborhoodMetrics | null;
  input_data: InputData;
}

// Uso
const response: PredictionResponse = await api.post('/rent/predict', data);

// Renderizar solo imágenes disponibles
{response.images.price_evolution && (
  <img src={response.images.price_evolution} alt="Evolución de precios" />
)}

{response.images.bar_price_by_amb && (
  <img src={response.images.bar_price_by_amb} alt="Precio por ambiente" />
)}

// Acceder a los parámetros originales
console.log('Barrio consultado:', response.input_data.barrio);
console.log('Fecha de consulta:', response.input_data.timestamp);

// Usar métricas si están disponibles
if (response.metrics) {
  console.log('Precio promedio del barrio:', response.metrics.precioPromedio);
  console.log('Tendencia:', response.metrics.tendenciaPrecio);
}
```

### Renderizar todas las imágenes disponibles

```typescript
const imageKeys = [
  { key: 'price_by_m2_evolution', title: 'Evolución Precio/m²' },
  { key: 'price_evolution', title: 'Evolución de Precios' },
  { key: 'bar_price_by_amb', title: 'Precio por Ambiente' },
  { key: 'bar_m2_price_by_amb', title: 'Precio/m² por Ambiente' },
  { key: 'bar_price_by_amb_neighborhood', title: 'Comparativa Barrios (Precio)' },
  { key: 'bar_m2_price_by_amb_neighborhood', title: 'Comparativa Barrios (Precio/m²)' },
  { key: 'pie_property_amb_distribution', title: 'Distribución por Ambientes' },
  { key: 'pie_property_m2_distribution_neighborhood', title: 'Distribución m² por Barrio' },
  { key: 'pie_property_amb_distribution_neighborhood', title: 'Distribución Ambientes por Barrio' },
];

return (
  <div className="image-gallery">
    {imageKeys.map(({ key, title }) => 
      response.images[key] && (
        <div key={key} className="image-card">
          <h3>{title}</h3>
          <img src={response.images[key]} alt={title} />
        </div>
      )
    )}
  </div>
);
```

### Renderizar Métricas del Barrio

```typescript
function NeighborhoodMetrics({ metrics }: { metrics: NeighborhoodMetrics | null }) {
  if (!metrics) {
    return (
      <div className="metrics-unavailable">
        <p>📊 Métricas no disponibles para este barrio/período</p>
      </div>
    );
  }

  return (
    <div className="neighborhood-metrics">
      <h3>Estadísticas del Barrio</h3>
      
      <div className="metric-card">
        <span className="label">Precio Promedio</span>
        <span className="value">${metrics.precioPromedio?.toLocaleString()}</span>
      </div>
      
      <div className="metric-card">
        <span className="label">Precio Mediano</span>
        <span className="value">${metrics.precioMediano?.toLocaleString()}</span>
      </div>
      
      <div className="metric-card">
        <span className="label">Inmuebles Disponibles</span>
        <span className="value">{metrics.inmueblesDisponibles}</span>
      </div>
      
      {metrics.tendenciaPrecio !== undefined && (
        <div className="metric-card">
          <span className="label">Tendencia de Precio</span>
          <span className={`value ${metrics.tendenciaPrecio >= 0 ? 'positive' : 'negative'}`}>
            {metrics.tendenciaPrecio >= 0 ? '↑' : '↓'} {Math.abs(metrics.tendenciaPrecio)}%
          </span>
        </div>
      )}
      
      <div className="metric-row">
        <div className="metric-small">
          <span className="label">Ofertas Nuevas</span>
          <span className="value">{metrics.ofertaNueva}</span>
        </div>
        <div className="metric-small">
          <span className="label">Ofertas Removidas</span>
          <span className="value">{metrics.ofertaRemovida}</span>
        </div>
      </div>
    </div>
  );
}

// Uso
<NeighborhoodMetrics metrics={response.metrics} />
```

### Guardar en Historial

```typescript
// Guardar predicción en historial local
function savePredictionToHistory(response: PredictionResponse) {
  const historyItem = {
    id: generateId(),
    prediction: response.predictionMin && response.predictionMax 
      ? { min: response.predictionMin, max: response.predictionMax }
      : response.prediction,
    input: response.input_data,  // ← Parámetros de la consulta
    images: response.images,
    savedAt: new Date().toISOString()
  };
  
  // Guardar en localStorage o enviar al backend
  const history = JSON.parse(localStorage.getItem('predictions') || '[]');
  history.unshift(historyItem);
  localStorage.setItem('predictions', JSON.stringify(history));
}

// Mostrar historial
function PredictionHistory() {
  const history = JSON.parse(localStorage.getItem('predictions') || '[]');
  
  return (
    <div>
      {history.map(item => (
        <div key={item.id} className="history-item">
          <h3>{item.input.barrio}</h3>
          <p>Ambientes: {item.input.ambientes}</p>
          <p>Dormitorios: {item.input.dormitorios}</p>
          <p>Precio: ${item.prediction.min} - ${item.prediction.max}</p>
          <p>Consultado: {new Date(item.input.timestamp).toLocaleString()}</p>
          <button onClick={() => rerunPrediction(item.input)}>
            🔄 Ejecutar nuevamente
          </button>
        </div>
      ))}
    </div>
  );
}

// Re-ejecutar consulta con los mismos parámetros
async function rerunPrediction(inputData: any) {
  // Usar los mismos parámetros del historial
  const response = await api.post('/rent/predict', {
    barrio: inputData.barrio,
    ambientes: inputData.ambientes,
    metrosCuadradosMin: inputData.metrosCuadradosMin,
    metrosCuadradosMax: inputData.metrosCuadradosMax,
    dormitorios: inputData.dormitorios,
    banos: inputData.banos,
    garajes: inputData.garajes,
    antiguedad: inputData.antiguedad
  });
  
  return response;
}
```

---

## 🔢 Valores de Predicción

### Con Min/Max

```typescript
{
  predictionMin: number,  // Predicción con metros cuadrados mínimos (redondeado hacia arriba)
  predictionMax: number   // Predicción con metros cuadrados máximos (redondeado hacia arriba)
}
```

**Ejemplo:**
```json
{
  "predictionMin": 950321,   // Para 50m²
  "predictionMax": 1199877   // Para 80m²
}
```

### Con Valor Único

```typescript
{
  prediction: number,  // Predicción única (redondeado hacia arriba)
  ...otrosCamposLambda
}
```

**Ejemplo:**
```json
{
  "prediction": 1050124  // Para 65m²
}
```

---

## 🎨 Ejemplo Completo de Rendering

```typescript
function PredictionResults({ data }: { data: PredictionResponse }) {
  return (
    <div>
      {/* Predicción */}
      <section>
        <h2>Predicción de Precio</h2>
        {data.predictionMin && data.predictionMax ? (
          <div>
            <p>Rango: ${data.predictionMin.toLocaleString()} - ${data.predictionMax.toLocaleString()}</p>
          </div>
        ) : (
          <div>
            <p>Precio estimado: ${data.prediction?.toLocaleString()}</p>
          </div>
        )}
      </section>

      {/* Gráficos de Evolución */}
      <section>
        <h2>Evolución de Precios</h2>
        <div className="charts-row">
          {data.images.price_evolution && (
            <img src={data.images.price_evolution} alt="Evolución de precios" />
          )}
          {data.images.price_by_m2_evolution && (
            <img src={data.images.price_by_m2_evolution} alt="Evolución precio/m²" />
          )}
        </div>
      </section>

      {/* Gráficos de Barras */}
      <section>
        <h2>Análisis por Ambientes</h2>
        <div className="charts-row">
          {data.images.bar_price_by_amb && (
            <img src={data.images.bar_price_by_amb} alt="Precio por ambiente" />
          )}
          {data.images.bar_m2_price_by_amb && (
            <img src={data.images.bar_m2_price_by_amb} alt="Precio/m² por ambiente" />
          )}
        </div>
      </section>

      {/* Gráficos de Torta */}
      <section>
        <h2>Distribución</h2>
        <div className="charts-row">
          {data.images.pie_property_amb_distribution && (
            <img src={data.images.pie_property_amb_distribution} alt="Distribución por ambientes" />
          )}
        </div>
      </section>

      {/* Comparativas entre Barrios */}
      {(data.images.bar_price_by_amb_neighborhood || data.images.bar_m2_price_by_amb_neighborhood) && (
        <section>
          <h2>Comparativa entre Barrios</h2>
          <div className="charts-row">
            {data.images.bar_price_by_amb_neighborhood && (
              <img src={data.images.bar_price_by_amb_neighborhood} alt="Comparativa precios" />
            )}
            {data.images.bar_m2_price_by_amb_neighborhood && (
              <img src={data.images.bar_m2_price_by_amb_neighborhood} alt="Comparativa precio/m²" />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
```

---

## ✅ Validación de Respuesta

```typescript
function validatePredictionResponse(data: any): boolean {
  // Verificar estructura básica
  if (!data || typeof data !== 'object') return false;

  // Verificar que tenga al menos una predicción
  if (!data.prediction && !(data.predictionMin && data.predictionMax)) {
    return false;
  }

  // Verificar que images sea un objeto
  if (!data.images || typeof data.images !== 'object') return false;

  // Verificar que todas las keys estén presentes
  const requiredKeys = [
    'price_by_m2_evolution',
    'price_evolution',
    'bar_price_by_amb',
    'bar_m2_price_by_amb',
    'bar_price_by_amb_neighborhood',
    'bar_m2_price_by_amb_neighborhood',
    'pie_property_amb_distribution',
    'pie_property_m2_distribution_neighborhood',
    'pie_property_amb_distribution_neighborhood',
  ];

  return requiredKeys.every(key => key in data.images);
}
```

---

## 📚 Referencias

- [Integración S3](./S3_IMAGES_INTEGRATION.md)
- [Formato Lambda Response](./LAMBDA_RESPONSE_FORMAT.md)
- [Doble Invocación Lambda](./DUAL_LAMBDA_INVOCATION.md)

---

✅ **Formato de respuesta estructurado y fácil de renderizar en el frontend!**

