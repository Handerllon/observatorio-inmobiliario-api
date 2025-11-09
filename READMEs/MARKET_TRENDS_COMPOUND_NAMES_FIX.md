# 🔧 Fix: Barrios Compuestos en Endpoint de Tendencias

## Problema

El endpoint `/market-trends/:barrio` estaba devolviendo **404 Not Found** para todos los barrios con nombres compuestos (con espacios):

❌ **Barrios afectados:**
- `PARQUE PATRICIOS`
- `PUERTO MADERO`
- `SAN NICOLAS`
- `SAN TELMO`
- `VILLA CRESPO`
- `VILLA DEL PARQUE`
- `VILLA URQUIZA`

## Causa Raíz

Los archivos de tendencias en S3 usan **espacios** en los nombres de carpeta:
```
reporting/trends/11_2025/VILLA CRESPO/market_trends.json
```

Pero el código estaba usando el método `normalizeBarrioName()` que convierte espacios a **guiones bajos**:
```typescript
// Antes (incorrecto para tendencias)
.replace(/\s+/g, "_")  // "VILLA CRESPO" → "VILLA_CRESPO"
```

Esto causaba que buscara:
```
reporting/trends/11_2025/VILLA_CRESPO/market_trends.json  ❌ No existe
```

## Solución Implementada

### 1. Nuevo Método de Normalización

Se creó un nuevo método específico para tendencias que **mantiene los espacios**:

```typescript
/**
 * Normaliza el nombre del barrio manteniendo espacios
 * Usado para: tendencias de mercado
 */
private normalizeBarrioNameWithSpaces(barrio: string): string {
  return barrio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // Eliminar acentos
    .toUpperCase()                     // Mayúsculas
    .trim()
    .replace(/\s+/g, " ");            // Mantener espacios simples
}
```

### 2. Método Original (Sin Cambios)

El método `normalizeBarrioName()` se mantiene **sin cambios** para métricas e imágenes:

```typescript
/**
 * Normaliza el nombre del barrio para usar en paths de S3
 * Convierte espacios a guiones bajos (_)
 * Usado para: imágenes y métricas
 */
private normalizeBarrioName(barrio: string): string {
  return barrio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_")              // Convertir a guiones bajos
    .replace(/[^A-Z0-9_]/g, "");
}
```

### 3. Actualización de `getMarketTrends()`

El método ahora usa el nuevo normalizador:

```typescript
async getMarketTrends(barrio: string): Promise<any | null> {
  // ...
  
  // Para tendencias, usar normalización con ESPACIOS
  const normalizedBarrio = this.normalizeBarrioNameWithSpaces(barrio);
  
  // Construir path con espacios
  const key = `reporting/trends/${dateFolder}/${normalizedBarrio}/market_trends.json`;
  // Ejemplo: reporting/trends/11_2025/VILLA CRESPO/market_trends.json ✅
  
  // ...
}
```

## Comparación: Antes vs Después

### Antes del Fix ❌

**Request:**
```
GET /market-trends/Villa Crespo
```

**Normalización:**
```
"Villa Crespo" → "VILLA_CRESPO"
```

**Path buscado en S3:**
```
reporting/trends/11_2025/VILLA_CRESPO/market_trends.json
```

**Resultado:** 404 Not Found (archivo no existe)

### Después del Fix ✅

**Request:**
```
GET /market-trends/Villa Crespo
```

**Normalización:**
```
"Villa Crespo" → "VILLA CRESPO" (con espacio)
```

**Path buscado en S3:**
```
reporting/trends/11_2025/VILLA CRESPO/market_trends.json
```

**Resultado:** 200 OK (archivo encontrado)

## Ejemplos de Uso

### Con curl

```bash
# Barrios con espacios funcionan correctamente ahora
curl "http://localhost:9000/market-trends/Villa Crespo"
curl "http://localhost:9000/market-trends/San Telmo"
curl "http://localhost:9000/market-trends/Puerto Madero"

# También con URL encoding
curl "http://localhost:9000/market-trends/Villa%20Crespo"
curl "http://localhost:9000/market-trends/San%20Nicolas"
```

### Con JavaScript

```javascript
// Usar encodeURIComponent para barrios con espacios
const barrio = 'Villa Crespo';
fetch(`http://localhost:9000/market-trends/${encodeURIComponent(barrio)}`)
  .then(r => r.json())
  .then(data => console.log(data));
```

## Normalización por Endpoint

### 📈 Tendencias de Mercado (NUEVO)

**Método:** `normalizeBarrioNameWithSpaces()`

**Transformación:**
- `"villa crespo"` → `"VILLA CRESPO"`
- `"San Telmo"` → `"SAN TELMO"`
- `"PARQUE PATRICIOS"` → `"PARQUE PATRICIOS"`
- `"Núñez"` → `"NUNEZ"`

**Path en S3:**
```
reporting/trends/11_2025/VILLA CRESPO/market_trends.json
reporting/trends/11_2025/SAN TELMO/market_trends.json
reporting/trends/11_2025/PARQUE PATRICIOS/market_trends.json
```

### 📊 Métricas e Imágenes (SIN CAMBIOS)

**Método:** `normalizeBarrioName()`

**Transformación:**
- `"villa crespo"` → `"VILLA_CRESPO"`
- `"San Telmo"` → `"SAN_TELMO"`
- `"PARQUE PATRICIOS"` → `"PARQUE_PATRICIOS"`
- `"Núñez"` → `"NUNEZ"`

**Path en S3:**
```
reporting/metrics/11_2025/VILLA_CRESPO/metrics.json
reporting/report_pictures/11_2025/VILLA_CRESPO/price_evolution.png
```

## Barrios Compuestos Soportados

✅ Todos los barrios con espacios ahora funcionan correctamente:

1. **PARQUE PATRICIOS**
2. **PUERTO MADERO**
3. **SAN NICOLAS**
4. **SAN TELMO**
5. **VILLA CRESPO**
6. **VILLA DEL PARQUE**
7. **VILLA URQUIZA**

## Tests

### Test Manual

```bash
# Probar cada barrio compuesto
curl "http://localhost:9000/market-trends/Parque Patricios"
curl "http://localhost:9000/market-trends/Puerto Madero"
curl "http://localhost:9000/market-trends/San Nicolas"
curl "http://localhost:9000/market-trends/San Telmo"
curl "http://localhost:9000/market-trends/Villa Crespo"
curl "http://localhost:9000/market-trends/Villa del Parque"
curl "http://localhost:9000/market-trends/Villa Urquiza"
```

**Resultado esperado:**
- 200 OK si el archivo existe en S3
- 404 Not Found si el archivo no existe (normal, no es error)

### Verificar Logs (LOG_LEVEL=DEBUG)

Con `LOG_LEVEL=DEBUG`, deberías ver:

```bash
[ 2025-11-09 12:00:00 - DEBUG ] 🏘️  Barrio recibido: "Villa Crespo"
[ 2025-11-09 12:00:00 - DEBUG ] 🏘️  Barrio normalizado (con espacios): "VILLA CRESPO"
[ 2025-11-09 12:00:00 - DEBUG ] 📈 Buscando tendencias de mercado en S3: s3://bucket/reporting/trends/11_2025/VILLA CRESPO/market_trends.json
```

Nota el **espacio** en el path de S3: `VILLA CRESPO` (no `VILLA_CRESPO`).

## Impacto del Cambio

### ✅ Sin Impacto en Código Existente

- ✅ Métricas: Siguen usando `normalizeBarrioName()` (con guiones bajos)
- ✅ Imágenes: Siguen usando `normalizeBarrioName()` (con guiones bajos)
- ✅ Predicciones: No afectadas (usan los otros métodos)

### ✅ Nuevo Comportamiento Solo para Tendencias

- ✅ Endpoint `/market-trends/:barrio` ahora usa `normalizeBarrioNameWithSpaces()`
- ✅ Barrios compuestos funcionan correctamente
- ✅ Backwards compatible (barrios sin espacios siguen funcionando)

## Archivos Modificados

### 1. `src/utils/AwsAdapter.ts`

**Cambios:**
- ✅ Añadido método `normalizeBarrioNameWithSpaces()`
- ✅ Actualizado `getMarketTrends()` para usar el nuevo método
- ✅ Añadidos logs de debug para barrio normalizado
- ✅ Documentación mejorada en comentarios

### 2. `READMEs/MARKET_TRENDS_ENDPOINT.md`

**Cambios:**
- ✅ Actualizada sección "Normalización de Barrio"
- ✅ Añadida advertencia sobre espacios vs guiones bajos
- ✅ Añadidos ejemplos con barrios compuestos
- ✅ Actualizada tabla de diferencias con métricas
- ✅ Añadida sección de troubleshooting específica
- ✅ Añadidos tests para barrios compuestos

### 3. `Observatorio_Inmobiliario_API.postman_collection.json`

**Cambios:**
- ✅ Cambiado ejemplo de `Palermo` a `Villa Crespo`
- ✅ Actualizada descripción con advertencia sobre espacios
- ✅ Añadidos ejemplos de URLs con barrios compuestos

## Consideraciones para S3

### ✅ Estructura Correcta en S3

Asegúrate de que los archivos en S3 estén con **espacios**:

```
reporting/
└── trends/
    └── 11_2025/
        ├── PALERMO/
        │   └── market_trends.json
        ├── VILLA CRESPO/          ← Con espacio
        │   └── market_trends.json
        ├── SAN TELMO/             ← Con espacio
        │   └── market_trends.json
        └── PARQUE PATRICIOS/      ← Con espacios
            └── market_trends.json
```

### ❌ Estructura Incorrecta

NO usar guiones bajos en tendencias:

```
reporting/
└── trends/
    └── 11_2025/
        ├── VILLA_CRESPO/          ← ❌ INCORRECTO
        │   └── market_trends.json
        └── SAN_TELMO/             ← ❌ INCORRECTO
            └── market_trends.json
```

## Debugging

### Si sigue dando 404

1. **Verificar estructura en S3:**
   ```bash
   aws s3 ls s3://bucket-name/reporting/trends/11_2025/
   ```
   
   Deberías ver carpetas con espacios:
   ```
   PRE VILLA CRESPO/
   PRE SAN TELMO/
   ```

2. **Verificar logs con DEBUG:**
   ```bash
   LOG_LEVEL=DEBUG npm start
   ```
   
   Buscar línea:
   ```
   🏘️  Barrio normalizado (con espacios): "VILLA CRESPO"
   ```

3. **Verificar path completo:**
   ```
   📈 Buscando tendencias de mercado en S3: s3://bucket/reporting/trends/11_2025/VILLA CRESPO/market_trends.json
   ```

4. **Probar con Postman:**
   - Usar el request incluido en la colección
   - Cambiar el barrio a uno con espacios
   - Verificar la URL en la barra de direcciones

## Resumen

| Antes | Después |
|-------|---------|
| ❌ `VILLA_CRESPO` | ✅ `VILLA CRESPO` |
| ❌ 404 para barrios compuestos | ✅ 200 OK para todos los barrios |
| ❌ Inconsistente con estructura S3 | ✅ Consistente con estructura S3 |
| ❌ Solo barrios simples funcionaban | ✅ Todos los barrios funcionan |

## Referencias

- Endpoint de Tendencias: `GET /market-trends/:barrio`
- Archivo principal: `src/utils/AwsAdapter.ts`
- Método nuevo: `normalizeBarrioNameWithSpaces()`
- Método existente (sin cambios): `normalizeBarrioName()`
- Documentación completa: `READMEs/MARKET_TRENDS_ENDPOINT.md`

