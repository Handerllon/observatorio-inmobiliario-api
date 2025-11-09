# 📊 Integración de Métricas del Barrio

## 📋 Overview

Se agregó la funcionalidad para incluir métricas estadísticas del barrio en cada respuesta de predicción, obtenidas desde archivos JSON almacenados en S3.

---

## 🎯 Funcionalidad

### Campo `metrics` en la Respuesta

Todas las respuestas de predicción ahora incluyen un campo `metrics` con estadísticas del barrio:

```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877,
  "images": {...},
  "metrics": {
    "precioPromedio": 1050000,
    "precioMediano": 980000,
    "inmueblesDisponibles": 234,
    "tendenciaPrecio": 5.2,
    "ofertaNueva": 45,
    "ofertaRemovida": 32
  },
  "input_data": {...}
}
```

---

## 📁 Ubicación en S3

### Estructura de Carpetas

```
s3://{BUCKET_NAME}/
└── reporting/
    └── metrics/
        └── {MM_YYYY}/                    ← Ej: 01_2025
            └── {BARRIO_NORMALIZADO}/     ← Ej: PALERMO
                └── metrics.json          ← Archivo con las métricas
```

### Ejemplos de Rutas

```
s3://bucket/reporting/metrics/01_2025/PALERMO/metrics.json
s3://bucket/reporting/metrics/01_2025/BELGRANO/metrics.json
s3://bucket/reporting/metrics/12_2024/RECOLETA/metrics.json
```

---

## 🔧 Implementación

### Ubicación del Código

**Archivo:** `src/utils/AwsAdapter.ts`

**Método:** `getNeighborhoodMetrics(barrio: string): Promise<any | null>`

### Flujo de Ejecución

```
executePrediction()
        ↓
[Obtener predicción Lambda]
        ↓
[Obtener imágenes S3] ← Ya existía
        ↓
[Obtener métricas S3] ← NUEVO
        ↓
Combinar todo en respuesta
```

### Código Relevante

```typescript
// En AwsAdapter.ts - método executeDualPrediction()
const imageUrls = await this.getReportImages(barrio);
const metrics = await this.getNeighborhoodMetrics(barrio);  // ← NUEVO

return {
  predictionMin: predictionMin,
  predictionMax: predictionMax,
  images: imageUrls,
  metrics: metrics,  // ← NUEVO
  input_data: inputData
};
```

---

## 📊 Formato del Archivo metrics.json

### Estructura Flexible

El contenido exacto del JSON depende de lo que se guarde en S3. El servicio lo retorna tal cual está:

```json
{
  "precioPromedio": 1050000,
  "precioMediano": 980000,
  "inmueblesDisponibles": 234,
  "tendenciaPrecio": 5.2,
  "ofertaNueva": 45,
  "ofertaRemovida": 32,
  "superficiePromedio": 65,
  "antiguedadPromedio": 15,
  "diasPromedioPublicacion": 28
}
```

### Campos No Requeridos

El objeto puede contener cualquier campo. No hay validación de estructura.

---

## 🔄 Normalización del Barrio

El nombre del barrio se normaliza igual que para las imágenes:

```typescript
"Palermo"       → "PALERMO"
"Núñez"         → "NUNEZ"
"Palermo Soho"  → "PALERMO_SOHO"
"San Telmo"     → "SAN_TELMO"
```

### Reglas de Normalización

1. **Remover acentos:** `á` → `a`, `ñ` → `n`
2. **Convertir a mayúsculas:** `palermo` → `PALERMO`
3. **Espacios a guiones bajos:** ` ` → `_`
4. **Remover caracteres especiales:** Solo `A-Z`, `0-9`, `_`

---

## ⚠️ Manejo de Errores

### Comportamiento

| Escenario | Resultado | ¿Es Error? |
|-----------|-----------|------------|
| Archivo existe | Retorna métricas parseadas | ❌ No |
| Archivo no existe | Retorna `null` | ❌ No (normal) |
| Error de permisos | Retorna `null` | ⚠️ Warning en logs |
| JSON inválido | Retorna `null` | ⚠️ Warning en logs |
| Bucket no configurado | Retorna `null` | ⚠️ Warning en logs |

### Logs

```bash
# Archivo encontrado
📊 Buscando métricas en S3: s3://bucket/reporting/metrics/01_2025/PALERMO/metrics.json
✅ Métricas obtenidas exitosamente para Palermo
📈 Métricas: { precioPromedio: 1050000, ... }

# Archivo no encontrado (normal)
📊 Buscando métricas en S3: s3://bucket/reporting/metrics/01_2025/BELGRANO/metrics.json
📭 Archivo de métricas no encontrado para Belgrano (esto es normal si no hay datos)

# Error crítico
❌ Error obteniendo métricas de S3: AccessDenied
```

---

## 💻 Uso en Frontend

### TypeScript Interface

```typescript
interface NeighborhoodMetrics {
  precioPromedio?: number;
  precioMediano?: number;
  inmueblesDisponibles?: number;
  tendenciaPrecio?: number;
  ofertaNueva?: number;
  ofertaRemovida?: number;
  [key: string]: any;  // Campos adicionales flexibles
}

interface PredictionResponse {
  predictionMin?: number;
  predictionMax?: number;
  prediction?: number;
  images: ImageMap;
  metrics: NeighborhoodMetrics | null;  // ← NUEVO
  input_data: InputData;
}
```

### Verificación de Disponibilidad

```typescript
const response = await api.post('/rent/predict', requestData);

if (response.metrics) {
  // Métricas disponibles
  console.log('Precio promedio:', response.metrics.precioPromedio);
  console.log('Tendencia:', response.metrics.tendenciaPrecio);
} else {
  // Métricas no disponibles para este barrio/período
  console.log('Sin métricas disponibles');
}
```

### Componente React

```tsx
function MetricsDisplay({ metrics }: { metrics: NeighborhoodMetrics | null }) {
  if (!metrics) {
    return <div>📊 Métricas no disponibles</div>;
  }

  return (
    <div className="metrics">
      <h3>Estadísticas del Barrio</h3>
      
      {metrics.precioPromedio && (
        <div>Precio Promedio: ${metrics.precioPromedio.toLocaleString()}</div>
      )}
      
      {metrics.tendenciaPrecio !== undefined && (
        <div className={metrics.tendenciaPrecio >= 0 ? 'positive' : 'negative'}>
          Tendencia: {metrics.tendenciaPrecio >= 0 ? '↑' : '↓'} 
          {Math.abs(metrics.tendenciaPrecio)}%
        </div>
      )}
      
      {metrics.inmueblesDisponibles && (
        <div>Inmuebles Disponibles: {metrics.inmueblesDisponibles}</div>
      )}
    </div>
  );
}
```

---

## 🔐 Permisos S3 Requeridos

El usuario/rol de IAM necesita permisos para leer objetos:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject"
  ],
  "Resource": [
    "arn:aws:s3:::your-bucket-name/reporting/metrics/*"
  ]
}
```

---

## 📝 Ejemplo Completo

### Request

```bash
curl -X POST http://localhost:3000/rent/predict \
  -H "Content-Type: application/json" \
  -d '{
    "barrio": "Palermo",
    "dormitorios": 2,
    "metrosCuadradosMin": 50,
    "metrosCuadradosMax": 80
  }'
```

### Response

```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877,
  "images": {
    "price_by_m2_evolution": "https://...",
    "price_evolution": "https://...",
    ...
  },
  "metrics": {
    "precioPromedio": 1050000,
    "precioMediano": 980000,
    "inmueblesDisponibles": 234,
    "tendenciaPrecio": 5.2,
    "ofertaNueva": 45,
    "ofertaRemovida": 32,
    "superficiePromedio": 65
  },
  "input_data": {
    "barrio": "Palermo",
    "metrosCuadradosMin": 50,
    "metrosCuadradosMax": 80,
    "dormitorios": 2,
    ...
  },
  "executionTimeMs": 2341,
  "timestamp": "2025-01-25T15:30:00.000Z"
}
```

---

## 🧪 Testing

### 1. Con Métricas Disponibles

```bash
# Asegurarse que existe el archivo
aws s3 ls s3://bucket/reporting/metrics/01_2025/PALERMO/metrics.json

# Hacer request
curl -X POST http://localhost:3000/rent/predict -d '{"barrio": "Palermo", ...}'

# Verificar que metrics no es null
```

### 2. Sin Métricas Disponibles

```bash
# Verificar que NO existe el archivo
aws s3 ls s3://bucket/reporting/metrics/01_2025/BARRIO_INEXISTENTE/

# Hacer request
curl -X POST http://localhost:3000/rent/predict -d '{"barrio": "Barrio Inexistente", ...}'

# Verificar que metrics es null (pero no hay error)
```

### 3. Verificar Logs

```bash
# Iniciar servidor en dev
npm run dev

# Hacer request y ver logs
# Debe mostrar:
# 📊 Buscando métricas en S3: ...
# ✅ Métricas obtenidas exitosamente para {barrio}
# O
# 📭 Archivo de métricas no encontrado para {barrio}
```

---

## 🚀 Ventajas

1. **Contexto adicional:** Usuario ve estadísticas del barrio
2. **Comparación:** Puede comparar su predicción con el promedio del barrio
3. **Tendencias:** Puede ver si el mercado está al alza o baja
4. **Flexibilidad:** Contenido del JSON es flexible
5. **No bloquea:** Si no hay métricas, la predicción funciona igual
6. **Performance:** Lectura de JSON es rápida (~50-100ms)

---

## 📚 Ver También

- `API_RESPONSE_FORMAT.md` - Formato completo de respuesta
- `S3_IMAGES_INTEGRATION.md` - Integración de imágenes (similar)
- `ARCHITECTURE_REFACTORING.md` - Arquitectura del AwsAdapter

---

**Fecha de implementación:** 2025-01-25  
**Ubicación del código:** `src/utils/AwsAdapter.ts`  
**Estado:** ✅ Implementado y funcional

