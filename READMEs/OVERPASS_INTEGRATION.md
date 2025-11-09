# Integración con Overpass API (OpenStreetMap)

## 📍 Resumen

La aplicación utiliza **Overpass API** (OpenStreetMap) para buscar lugares cercanos a una dirección geocodificada. Overpass API es un servicio gratuito que ofrece excelente cobertura de datos en Argentina y LATAM.

## 🏗️ Arquitectura

### Flujo de Geocodificación y Búsqueda de Lugares

```
┌─────────────────┐
│  RentController │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌──────────────────┐                  ┌────────────────────┐
│   AWS Adapter    │                  │ Overpass Adapter   │
│  (Geocodificación)│                  │ (Lugares Cercanos) │
└──────────────────┘                  └────────────────────┘
         │                                     │
         ▼                                     ▼
┌──────────────────┐                  ┌────────────────────┐
│ AWS Location     │                  │   Overpass API     │
│   Service        │                  │  (OpenStreetMap)   │
└──────────────────┘                  └────────────────────┘
   (lat, lng)                          (Lugares: restaurants,
                                        schools, parks, etc.)
```

### ¿Por qué esta arquitectura híbrida?

- **AWS Location Service**: Excelente para geocodificación (convertir "Palermo, Buenos Aires" a coordenadas)
- **Overpass API**: Mejor cobertura de POIs (Points of Interest) en Argentina, especialmente comercios locales

## 🔧 Implementación

### OverpassAdapter

Ubicación: `src/utils/OverpassAdapter.ts`

```typescript
export class OverpassAdapter {
  private overpassUrl = "https://overpass-api.de/api/interpreter";
  private searchRadius = 500; // 500 metros

  async getNearbyPlaces(lat: number, lng: number): Promise<any>
  private async searchByCategory(lat: number, lng: number, category: string, limit: number)
  private buildOverpassQuery(lat: number, lng: number, category: string): string
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number
}
```

### Categorías Soportadas

El adapter busca lugares en las siguientes categorías:

1. **Restaurants**: Restaurantes, cafés, fast food
2. **Schools**: Escuelas, universidades, colegios
3. **Parks**: Parques, jardines
4. **Pharmacies**: Farmacias
5. **Supermarkets**: Supermercados, tiendas de conveniencia
6. **Banks**: Bancos, cajeros automáticos
7. **Transports**: Estaciones de tren, subte, paradas de bus

### Overpass Query Language (QL)

Ejemplo de query para restaurantes:

```
[out:json][timeout:10];
(
  node["amenity"="restaurant"](around:500,lat,lng);
  node["amenity"="cafe"](around:500,lat,lng);
  node["amenity"="fast_food"](around:500,lat,lng);
  way["amenity"="restaurant"](around:500,lat,lng);
  way["amenity"="cafe"](around:500,lat,lng);
);
out center;
```

## 📋 Formato de Respuesta

### Estructura de Lugar Individual

```json
{
  "name": "La Panadería de Pablo",
  "address": "Av. Santa Fe 1234, Palermo",
  "rating": null,
  "distance": 250,
  "types": ["restaurant", "cafe"],
  "location": {
    "lat": -34.5885,
    "lng": -58.4172
  },
  "osm_id": 123456789,
  "osm_type": "node"
}
```

### Estructura Completa de Nearby Places

```json
{
  "coordinates": {
    "lat": -34.5885,
    "lng": -58.4172
  },
  "restaurants": [...],
  "schools": [...],
  "parks": [...],
  "pharmacies": [...],
  "supermarkets": [...],
  "banks": [...],
  "transports": [...],
  "summary": {
    "total": 28,
    "restaurants": 5,
    "schools": 3,
    "parks": 3,
    "pharmacies": 3,
    "supermarkets": 3,
    "banks": 3,
    "transports": 5
  }
}
```

## 🔄 Flujo en RentController

```typescript
// PASO 1: Obtener coordenadas desde AWS Location Service
const coordinates = await awsAdapter.getCoordinates(calle, barrio);

// PASO 2: Buscar lugares cercanos con Overpass (solo si hay coordenadas)
let nearbyPlaces = null;
if (coordinates) {
  nearbyPlaces = await overpassAdapter.getNearbyPlaces(
    coordinates.lat,
    coordinates.lng
  );
}
```

## 🎯 Ventajas de Overpass API

### ✅ Pros

1. **Gratuito**: 100% gratis, sin límites de API key
2. **Cobertura en Argentina**: Excelente información de comercios locales
3. **Datos actualizados**: Comunidad activa de OpenStreetMap
4. **Flexible**: Query language muy potente
5. **Sin autenticación**: No requiere API keys ni configuración

### ⚠️ Consideraciones

1. **Sin ratings**: OpenStreetMap no incluye ratings de usuarios
2. **Rate limits**: Máximo ~2 queries por segundo (manejado automáticamente)
3. **Datos variables**: Depende de la contribución de la comunidad
4. **Timeouts**: Queries complejas pueden fallar (mitigado con timeout de 10s)

## 🌐 Endpoints de Overpass

### Endpoint Principal
```
https://overpass-api.de/api/interpreter
```

### Método de Request
```
POST /api/interpreter
Content-Type: text/plain
Body: [Overpass QL Query]
```

### Instancias Alternativas (para failover)

Si la instancia principal está caída, puedes usar:
- `https://overpass.kumi.systems/api/interpreter`
- `https://overpass.nchc.org.tw/api/interpreter`

## 🔍 Debugging

### Logs

El adapter genera logs detallados:

```
📍 Buscando lugares cercanos con Overpass: -34.5885, -58.4172 (radio: 500m)
  ✓ restaurant: 5 encontrados
  ✓ school: 3 encontrados
  ✓ park: 3 encontrados
  ✓ pharmacy: 3 encontrados
  ✓ supermarket: 3 encontrados
  ✓ bank: 3 encontrados
  ✓ transport: 5 encontrados
✅ Se encontraron 27 lugares cercanos con Overpass
```

### Herramientas de Testing

- **Overpass Turbo**: https://overpass-turbo.eu/
  - Interfaz web para probar queries
  - Visualización en mapa
  - Export a JSON

## 🚀 Mejoras Futuras

### Posibles Optimizaciones

1. **Caché de resultados**: Guardar resultados por coordenadas
2. **Fallback instances**: Implementar failover automático entre servidores Overpass
3. **Filtrado avanzado**: Agregar filtros por horarios, accesibilidad, etc.
4. **Distancia configurable**: Permitir ajustar el radio de búsqueda

### Integración con Ratings

Si se requieren ratings, considerar agregar:
- **Google Places API**: Solo para ratings (más costoso)
- **Foursquare API**: Alternativa con ratings
- **Ratings propios**: Sistema interno de valoraciones

## 📚 Referencias

- **Overpass API Wiki**: https://wiki.openstreetmap.org/wiki/Overpass_API
- **Overpass QL Guide**: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL
- **OSM Tag Browser**: https://taginfo.openstreetmap.org/
- **Overpass Turbo**: https://overpass-turbo.eu/

## 🔒 Configuración Requerida

### Variables de Entorno

Para geocodificación (AWS Location Service):
```bash
AWS_LOCATION_PLACE_INDEX=observatorio-places
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY_ID=your_secret_key
```

Para Overpass (sin configuración necesaria):
- No requiere API keys
- No requiere autenticación
- Funciona out-of-the-box

## 💡 Ejemplos de Uso

### Búsqueda básica

```typescript
const overpassAdapter = new OverpassAdapter();

// Palermo, Buenos Aires
const nearbyPlaces = await overpassAdapter.getNearbyPlaces(
  -34.5885,
  -58.4172
);

console.log(nearbyPlaces.summary.total); // 28 lugares
console.log(nearbyPlaces.restaurants.length); // 5 restaurantes
```

### Manejo de errores

```typescript
try {
  const places = await overpassAdapter.getNearbyPlaces(lat, lng);
  
  if (places.summary.total === 0) {
    console.log("No se encontraron lugares cercanos");
  }
  
} catch (error) {
  console.error("Error con Overpass:", error);
  // Retorna estructura vacía automáticamente
}
```

## 📊 Comparación: AWS Location vs Overpass

| Característica | AWS Location | Overpass (OSM) |
|----------------|--------------|----------------|
| **Costo** | ~$5/1000 geocodificaciones | Gratis |
| **Cobertura Argentina** | Media | Excelente |
| **Ratings** | No | No |
| **Autenticación** | Sí (IAM) | No |
| **Rate Limits** | Según plan | ~2 req/s |
| **Datos comerciales** | Limitado | Abundante |
| **Latencia** | Baja (~100ms) | Media (~300-500ms) |
| **Confiabilidad** | 99.9% SLA | ~99% |

## 🎨 Uso en Frontend

### Renderizado de Lugares

```typescript
interface NearbyPlace {
  name: string;
  address: string;
  rating: null;
  distance: number;
  types: string[];
  location: { lat: number; lng: number };
  osm_id: number;
  osm_type: string;
}

// Ordenar por distancia
nearbyPlaces.restaurants.sort((a, b) => a.distance - b.distance);

// Formatear distancia
const formatDistance = (meters: number) => {
  return meters < 1000 
    ? `${meters}m` 
    : `${(meters / 1000).toFixed(1)}km`;
};
```

### Visualización en Mapa

```typescript
// Usar osm_id para link a OpenStreetMap
const osmLink = (place: NearbyPlace) => {
  return `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`;
};

// Coordenadas para marcadores en mapa
const markers = nearbyPlaces.restaurants.map(place => ({
  lat: place.location.lat,
  lng: place.location.lng,
  title: place.name,
  type: 'restaurant'
}));
```

