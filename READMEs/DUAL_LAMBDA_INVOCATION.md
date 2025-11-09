# 🔄 Doble Invocación Lambda - Predicciones Min/Max

## 📋 Descripción

El sistema ahora invoca la función Lambda **DOS veces en paralelo** cuando se proporcionan valores mínimo y máximo de metros cuadrados, obteniendo predicciones para ambos escenarios.

### ✨ Ventajas

- **Rango completo de precios:** Obtienes predicciones para propiedades pequeñas y grandes
- **Más información:** Dos predicciones en lugar de una sola basada en el promedio
- **Eficiencia:** Las invocaciones se realizan en **paralelo** (no secuencial)
- **Consolidado automático:** El sistema genera un resumen consolidado de ambas predicciones

---

## 🔀 Flujo de Ejecución

### Caso 1: Con Valores Min y Max (2 invocaciones)

```
Request con metrosCuadradosMin=50 y metrosCuadradosMax=80
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   Lambda (50m²)          Lambda (80m²)
        ↓                       ↓
   Predicción MIN        Predicción MAX
        ↓                       ↓
        └───────────┬───────────┘
                    ↓
            Resultado Combinado
         (Individual + Consolidado)
```

### Caso 2: Sin Valores Min/Max (1 invocación)

```
Request con total_area=65
        ↓
   Lambda (65m²)
        ↓
   Predicción única
        ↓
   Resultado directo
```

---

## 📤 Request

### Formato con Min/Max (Dispara 2 invocaciones)

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

**Logs del servidor:**
```
🚀 Invocando Lambda: rent-prediction-function
📦 Request Body Original: { "barrio": "Palermo", ... }
🔄 Detectados valores min y max - Se invocarán 2 predicciones
📦 Invocando Lambda (MIN) con área: 50m²
📦 Invocando Lambda (MAX) con área: 80m²
✅ Resultados combinados: { ... }
```

### Formato con Valor Único (Dispara 1 invocación)

```json
{
  "barrio": "Palermo",
  "ambientes": 3,
  "total_area": 65,
  "dormitorios": 2,
  "banos": 1,
  "garajes": 1,
  "antiguedad": 5
}
```

**Logs del servidor:**
```
🚀 Invocando Lambda: rent-prediction-function
📦 Request Body Original: { "barrio": "Palermo", ... }
📊 Valor único de área - Se invocará 1 predicción
✅ Respuesta de Lambda: { ... }
```

---

## 📥 Response

### Respuesta con 2 Invocaciones

Cuando se detectan valores min y max, la respuesta incluye:

```json
{
  "consultas": {
    "metros_cuadrados_min": 50,
    "metros_cuadrados_max": 80
  },
  
  "prediccion_minima": {
    "area_m2": 50,
    "inmuebles_disponibles": 120,
    "publicaciones_removidas": 5,
    "publicaciones_nuevas": 12,
    "precio_cota_inferior": 85000,
    "precio_cota_superior": 110000,
    "moneda": "ARS"
  },
  
  "prediccion_maxima": {
    "area_m2": 80,
    "inmuebles_disponibles": 95,
    "publicaciones_removidas": 8,
    "publicaciones_nuevas": 15,
    "precio_cota_inferior": 105000,
    "precio_cota_superior": 135000,
    "moneda": "ARS"
  },
  
  "consolidado": {
    "inmuebles_disponibles": 108,          // Promedio: (120 + 95) / 2
    "publicaciones_removidas": 7,          // Promedio: (5 + 8) / 2
    "publicaciones_nuevas": 14,            // Promedio: (12 + 15) / 2
    "precio_cota_inferior": 85000,         // Mínimo de ambas predicciones
    "precio_cota_superior": 135000,        // Máximo de ambas predicciones
    "precio_promedio": 106250,             // Promedio de todos los precios
    "moneda": "ARS"
  },
  
  "metadata": {
    "invocaciones": 2,
    "timestamp": "2025-01-23T15:30:00.000Z",
    "lambda_function": "rent-prediction-function"
  }
}
```

### Respuesta con 1 Invocación

Cuando se proporciona un valor único:

```json
{
  "inmuebles_disponibles": 108,
  "publicaciones_removidas": 7,
  "publicaciones_nuevas": 14,
  "precio_cota_inferior": 95000,
  "precio_cota_superior": 125000,
  "moneda": "ARS"
}
```

---

## 🔍 Detalles de Implementación

### 1. Detección de Min/Max

```typescript
private hasMinMaxArea(body: any): boolean {
  const hasMin = body.metrosCuadradosMin || body.surface_min;
  const hasMax = body.metrosCuadradosMax || body.surface_max;
  
  return !!(hasMin && hasMax && hasMin !== hasMax);
}
```

**Se disparan 2 invocaciones si:**
- ✅ Existe `metrosCuadradosMin` o `surface_min`
- ✅ Existe `metrosCuadradosMax` o `surface_max`
- ✅ Los valores son diferentes (no iguales)

**Se dispara 1 invocación si:**
- ❌ Solo existe uno de los valores
- ❌ Los valores son iguales
- ❌ Se proporciona `total_area` directamente

### 2. Invocación en Paralelo

```typescript
const [resultMin, resultMax] = await Promise.all([
  this.invokeLambdaWithArea(body, "min"),
  this.invokeLambdaWithArea(body, "max")
]);
```

Usa `Promise.all()` para ejecutar ambas invocaciones **simultáneamente**, reduciendo el tiempo total de espera.

**Tiempo de ejecución:**
- Secuencial: ~4 segundos (2 × 2s)
- Paralelo: ~2 segundos (max de ambas)

### 3. Consolidación de Resultados

El método `combineResults()` genera tres secciones:

#### a) Resultados Individuales
Cada predicción con su área correspondiente.

#### b) Consolidado
- **Inmuebles/Publicaciones:** Promedio simple
- **Precio Inferior:** Mínimo de ambas predicciones
- **Precio Superior:** Máximo de ambas predicciones
- **Precio Promedio:** Promedio de los 4 valores (2 inferiores + 2 superiores)

#### c) Metadata
Información sobre la ejecución (timestamp, # de invocaciones, función Lambda).

---

## 🧪 Ejemplos de Uso

### Ejemplo 1: Buscar Departamento Flexible

**Scenario:** El usuario busca un departamento pero está flexible con el tamaño.

```bash
curl -X POST http://localhost:9000/rent/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "barrio": "Belgrano",
    "ambientes": 2,
    "metrosCuadradosMin": 45,
    "metrosCuadradosMax": 65,
    "dormitorios": 1,
    "banos": 1
  }'
```

**Resultado:**
```json
{
  "consultas": {
    "metros_cuadrados_min": 45,
    "metros_cuadrados_max": 65
  },
  "prediccion_minima": {
    "area_m2": 45,
    "precio_cota_inferior": 75000,
    "precio_cota_superior": 95000
  },
  "prediccion_maxima": {
    "area_m2": 65,
    "precio_cota_inferior": 95000,
    "precio_cota_superior": 120000
  },
  "consolidado": {
    "precio_cota_inferior": 75000,  // Mínimo absoluto
    "precio_cota_superior": 120000, // Máximo absoluto
    "precio_promedio": 96250
  }
}
```

**Interpretación:**
- Propiedades de **45m²**: entre $75,000 y $95,000
- Propiedades de **65m²**: entre $95,000 y $120,000
- **Rango completo**: $75,000 - $120,000

### Ejemplo 2: Casa con Rango Grande

```bash
curl -X POST http://localhost:9000/rent/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "barrio": "Caballito",
    "ambientes": 4,
    "metrosCuadradosMin": 80,
    "metrosCuadradosMax": 120,
    "dormitorios": 3,
    "banos": 2,
    "garajes": 1
  }'
```

**Uso:** Obtener predicciones para casas de distintos tamaños en el mismo barrio.

### Ejemplo 3: Valor Único (Sin Doble Invocación)

```bash
curl -X POST http://localhost:9000/rent/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "barrio": "Palermo",
    "total_area": 70,
    "dormitorios": 2,
    "banos": 1
  }'
```

**Resultado:** Respuesta simple sin estructura consolidada.

---

## 📊 Comparación de Respuestas

| Aspecto | 1 Invocación | 2 Invocaciones |
|---------|--------------|----------------|
| **Request** | `total_area: 65` | `min: 50, max: 80` |
| **Lambda calls** | 1 | 2 (paralelo) |
| **Tiempo aprox.** | ~2s | ~2s (paralelo) |
| **Estructura** | Simple | Compleja (individual + consolidado) |
| **Información** | Una predicción | Dos predicciones + resumen |
| **Rango de precios** | Uno | Amplio (combina ambos) |

---

## 💡 Casos de Uso

### 1. **Búsqueda Flexible de Propiedades**
Usuario no tiene claro el tamaño exacto que quiere.

```json
{
  "metrosCuadradosMin": 50,
  "metrosCuadradosMax": 80
}
```

### 2. **Análisis de Mercado**
Comparar precios entre propiedades pequeñas vs grandes en el mismo barrio.

### 3. **Dashboard de Estadísticas**
Mostrar rango de precios amplio basado en múltiples predicciones.

### 4. **Recomendaciones Personalizadas**
Sugerir al usuario propiedades dentro del rango consolidado.

---

## ⚙️ Configuración

No requiere configuración adicional. El sistema detecta automáticamente si debe hacer 1 o 2 invocaciones basándose en los parámetros del request.

### Variables de Entorno (ya existentes)

```bash
LAMBDA_PREDICTION_FUNCTION_NAME=rent-prediction-function
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

---

## 🎯 Performance

### Optimización con Promise.all()

Las dos invocaciones se realizan en **paralelo**, no secuencial:

```typescript
// ✅ PARALELO (actual)
const [resultMin, resultMax] = await Promise.all([
  invokeLambda(50),
  invokeLambda(80)
]);
// Tiempo: ~2 segundos (max de ambas)

// ❌ SECUENCIAL (si fuera así)
const resultMin = await invokeLambda(50);
const resultMax = await invokeLambda(80);
// Tiempo: ~4 segundos (suma de ambas)
```

### Costos AWS Lambda

- **Request normal:** 1 invocación = $0.0000002
- **Request con min/max:** 2 invocaciones = $0.0000004

El costo adicional es mínimo comparado con el valor de información obtenida.

---

## 🐛 Troubleshooting

### Las 2 invocaciones no se activan

**Verificar:**
1. ¿Existen ambos valores `metrosCuadradosMin` y `metrosCuadradosMax`?
2. ¿Son valores diferentes? (si son iguales, solo se invoca 1 vez)
3. Revisar logs: debe aparecer `🔄 Detectados valores min y max`

### Error en una de las invocaciones

Si una invocación falla, ambas fallan (no hay resultado parcial).

**Solución:** Revisar logs de Lambda para identificar cuál falló:
```bash
aws logs tail /aws/lambda/rent-prediction-function --follow
```

### Respuesta muy lenta

**Causas posibles:**
- Lambda con cold start (primera invocación)
- Lambda sin suficiente memoria
- Timeout muy bajo

**Solución:**
```bash
# Aumentar memoria (reduce cold start)
aws lambda update-function-configuration \
  --function-name rent-prediction-function \
  --memory-size 1024

# Aumentar timeout
aws lambda update-function-configuration \
  --function-name rent-prediction-function \
  --timeout 60
```

---

## 📚 Referencias

- [Servicio RentService](../src/services/RentService.ts)
- [Integración Lambda](./LAMBDA_INTEGRATION_SUMMARY.md)
- [Estructura de Predicciones](./RENT_PREDICTION_FIELDS.md)

---

✅ **Sistema configurado para predicciones dual con invocaciones paralelas!**

