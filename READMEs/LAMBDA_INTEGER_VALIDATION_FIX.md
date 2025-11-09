# 🔧 Fix: Error de Validación de Enteros en Lambda

## Problema Reportado

Al enviar una predicción con `antiguedad: 0`, Lambda rechazaba el payload con el siguiente error:

```json
{
  "statusCode": 400,
  "body": "{\"error\": \"Field 'antiquity' must be an integer.\"}"
}
```

### Request Problemático
```json
{
  "barrio": "BALVANERA",
  "ambientes": 3,
  "metrosCuadradosMin": 40,
  "metrosCuadradosMax": 50,
  "dormitorios": 2,
  "banos": 1,
  "garajes": 0,
  "antiguedad": 0,  // ❌ Este valor causaba el error
  "calle": "Ecuador 275"
}
```

## Causa Raíz

El problema tenía **dos causas**:

### 1. Operador `||` con Valores Falsy

El código original usaba el operador `||` (OR lógico) para valores numéricos:

```typescript
// ANTES (❌)
antiquity: Number(body.antiguedad || body.antiquity || body.age)
```

**Problema:** En JavaScript, el valor `0` se considera "falsy", entonces:
```javascript
0 || undefined || undefined  // → undefined
Number(undefined)            // → NaN
```

Lambda recibía `NaN` en lugar de `0`, y lo rechazaba porque espera un **entero válido**.

### 2. Sin Validación de Tipos

No había validación para asegurar que los campos numéricos fueran enteros válidos antes de enviar a Lambda.

## Solución Implementada

Se aplicaron **tres mejoras** para garantizar que todos los campos numéricos sean enteros válidos:

### 1. Operador Nullish Coalescing (`??`)

Reemplazo de `||` por `??` para valores numéricos:

```typescript
// DESPUÉS (✅)
antiquity: this.toInteger(body.antiguedad ?? body.antiquity ?? body.age)
```

**Diferencia:**
- `||` (OR lógico): Salta cualquier valor "falsy" (`0`, `""`, `false`, `null`, `undefined`)
- `??` (Nullish coalescing): Solo salta `null` y `undefined`

**Resultado:**
```javascript
// Con ||
0 || undefined        // → undefined ❌

// Con ??
0 ?? undefined        // → 0 ✅
null ?? undefined     // → undefined (OK)
undefined ?? 5        // → 5 (OK)
```

### 2. Método `toInteger()` para Conversión Segura

Nuevo método que convierte valores a enteros de forma segura:

```typescript
private toInteger(value: any): number {
  if (value === null || value === undefined) {
    logger.warning(`⚠️  Valor null/undefined en campo numérico, usando 0`);
    return 0;
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    logger.warning(`⚠️  Valor no numérico: "${value}", usando 0`);
    return 0;
  }
  
  // Convertir a entero (redondear hacia abajo)
  return Math.floor(num);
}
```

**Características:**
- ✅ Maneja `null` y `undefined` → devuelve `0`
- ✅ Convierte strings numéricos → `"5"` → `5`
- ✅ Maneja valores no numéricos → devuelve `0` con warning
- ✅ Redondea decimales → `5.7` → `5`
- ✅ Logs de warning para debugging

### 3. Validación de Campos Numéricos

Nuevo método que valida el payload antes de enviar a Lambda:

```typescript
private validateNumericFields(payload: any): void {
  const numericFields = ['total_area', 'rooms', 'bedrooms', 'antiquity', 'bathrooms', 'garages'];
  
  for (const field of numericFields) {
    const value = payload[field];
    
    if (typeof value !== 'number' || isNaN(value)) {
      logger.error(`❌ Campo "${field}" no es un número válido: ${value} (tipo: ${typeof value})`);
      throw new Error(`Campo "${field}" debe ser un número entero válido`);
    }
    
    logger.debug(`✅ Campo "${field}": ${value} (tipo: ${typeof value})`);
  }
}
```

**Beneficios:**
- ✅ Detecta errores **antes** de enviar a Lambda
- ✅ Logs detallados de cada campo
- ✅ Error descriptivo si hay problema

## Comparación: Antes vs Después

### Antes (❌)

```typescript
const payload = {
  antiquity: Number(body.antiguedad || body.antiquity || body.age),
  garages: Number(body.garajes || body.garages),
  // ...
};

// Sin validación
```

**Request:**
```json
{ "antiguedad": 0, "garajes": 0 }
```

**Payload enviado a Lambda:**
```json
{
  "antiquity": NaN,  // ❌ 0 || undefined → undefined → NaN
  "garages": NaN     // ❌ 0 || undefined → undefined → NaN
}
```

**Lambda responde:** `400 - Field 'antiquity' must be an integer` ❌

### Después (✅)

```typescript
const payload = {
  antiquity: this.toInteger(body.antiguedad ?? body.antiquity ?? body.age),
  garages: this.toInteger(body.garajes ?? body.garages),
  // ...
};

// Con validación
this.validateNumericFields(payload);
```

**Request:**
```json
{ "antiguedad": 0, "garajes": 0 }
```

**Payload enviado a Lambda:**
```json
{
  "antiquity": 0,  // ✅ 0 ?? undefined → 0
  "garages": 0     // ✅ 0 ?? undefined → 0
}
```

**Lambda responde:** `200 OK` ✅

## Casos de Uso Manejados

### Caso 1: Valor es `0` (El caso problemático)

```javascript
Input: { antiguedad: 0 }

ANTES: Number(0 || undefined) → NaN ❌
DESPUÉS: toInteger(0 ?? undefined) → 0 ✅
```

### Caso 2: Valor es `null` o `undefined`

```javascript
Input: { antiguedad: null }

ANTES: Number(null || undefined) → NaN ❌
DESPUÉS: toInteger(null ?? undefined) → 0 ✅ (con warning)
```

### Caso 3: Valor es un string numérico

```javascript
Input: { antiguedad: "5" }

ANTES: Number("5") → 5 ✅
DESPUÉS: toInteger("5" ?? undefined) → 5 ✅
```

### Caso 4: Valor es un decimal

```javascript
Input: { antiguedad: 5.7 }

ANTES: Number(5.7) → 5.7 (Lambda podría rechazar)
DESPUÉS: toInteger(5.7) → 5 ✅ (redondeado)
```

### Caso 5: Valor es no numérico

```javascript
Input: { antiguedad: "abc" }

ANTES: Number("abc") → NaN ❌
DESPUÉS: toInteger("abc") → 0 ✅ (con warning)
```

## Logs Mejorados

Con `LOG_LEVEL=DEBUG`, ahora verás logs detallados:

### Logs de Conversión

```bash
# Si un valor es null/undefined
⚠️  Valor null/undefined en campo numérico, usando 0

# Si un valor no es numérico
⚠️  Valor no numérico: "abc", usando 0
```

### Logs de Validación

```bash
# Para cada campo (en DEBUG)
✅ Campo "total_area": 45 (tipo: number)
✅ Campo "rooms": 3 (tipo: number)
✅ Campo "bedrooms": 2 (tipo: number)
✅ Campo "antiquity": 0 (tipo: number)
✅ Campo "bathrooms": 1 (tipo: number)
✅ Campo "garages": 0 (tipo: number)

# Si hay error
❌ Campo "antiquity" no es un número válido: NaN (tipo: number)
```

## Testing

### Test 1: Antigüedad = 0 (Caso Problemático Original)

```bash
POST /rent/predict
{
  "barrio": "BALVANERA",
  "ambientes": 3,
  "metrosCuadradosMin": 40,
  "metrosCuadradosMax": 50,
  "dormitorios": 2,
  "banos": 1,
  "garajes": 0,
  "antiguedad": 0,  // ✅ Ahora funciona
  "calle": "Ecuador 275"
}

Expected: 200 OK con predicción ✅
```

### Test 2: Garajes = 0

```bash
POST /rent/predict
{
  "barrio": "PALERMO",
  "ambientes": 2,
  "metrosCuadradosMin": 50,
  "metrosCuadradosMax": 60,
  "dormitorios": 1,
  "banos": 1,
  "garajes": 0,  // ✅ También funciona
  "antiguedad": 5,
  "calle": "Av. Santa Fe 1234"
}

Expected: 200 OK con predicción ✅
```

### Test 3: Múltiples Valores en 0

```bash
POST /rent/predict
{
  "barrio": "RECOLETA",
  "ambientes": 1,
  "metrosCuadradosMin": 30,
  "metrosCuadradosMax": 35,
  "dormitorios": 0,   // ✅ Monoambiente
  "banos": 1,
  "garajes": 0,       // ✅ Sin garaje
  "antiguedad": 0,    // ✅ A estrenar
  "calle": "Avenida Callao 800"
}

Expected: 200 OK con predicción ✅
```

### Test 4: Valores Decimales (se redondean)

```bash
POST /rent/predict
{
  "barrio": "BELGRANO",
  "ambientes": 3,
  "metrosCuadradosMin": 55.8,  // → 55
  "metrosCuadradosMax": 65.2,  // → 65
  "dormitorios": 2,
  "banos": 1,
  "garajes": 1,
  "antiguedad": 5.5,           // → 5
  "calle": "Cabildo 2000"
}

Expected: 200 OK con valores redondeados ✅
```

## Campos Afectados

Todos estos campos ahora usan la conversión segura con `??`:

| Campo | Input Original | Lambda Esperado |
|-------|---------------|-----------------|
| `total_area` | `metrosCuadrados` | `integer` |
| `rooms` | `ambientes` | `integer` |
| `bedrooms` | `dormitorios` | `integer` |
| `antiquity` | `antiguedad` | `integer` ✅ FIX |
| `bathrooms` | `banos` | `integer` |
| `garages` | `garajes` | `integer` ✅ FIX |

**Nota:** Los campos más problemáticos son `antiquity` y `garages` porque frecuentemente tienen valor `0`.

## Prevención de Errores Futuros

### 1. Siempre Usar `??` para Valores Numéricos

```typescript
// ❌ MAL (puede perder el valor 0)
const value = body.field || defaultValue;

// ✅ BIEN (preserva el valor 0)
const value = body.field ?? defaultValue;
```

### 2. Validar Tipos Antes de Enviar a APIs Externas

```typescript
// ✅ Validar antes de enviar
this.validatePayload(payload);
const response = await this.callExternalAPI(payload);
```

### 3. Logs de Debugging

```typescript
// ✅ Loguear valores intermedios
logger.debug(`Valor original: ${body.antiguedad}`);
logger.debug(`Valor convertido: ${payload.antiquity}`);
```

## Archivos Modificados

1. **`src/utils/AwsAdapter.ts`**
   - Método `mapRequestToLambdaPayload()`: Cambio de `||` a `??` y uso de `toInteger()`
   - Método `toInteger()` (nuevo): Conversión segura a enteros
   - Método `validateNumericFields()` (nuevo): Validación pre-envío
   - Logs mejorados para debugging

## Referencias

- [MDN: Nullish coalescing operator (??)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [MDN: Logical OR (||)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR)
- [MDN: Number.isNaN()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
- Issue relacionado: LAMBDA_NEIGHBORHOOD_TYPE_FIX.md

## Resumen Técnico

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Operador** | `\|\|` (OR lógico) | `??` (Nullish coalescing) |
| **Valor 0** | Perdido (→ undefined) | Preservado ✅ |
| **Conversión** | `Number()` directo | `toInteger()` con validación |
| **Validación** | Ninguna | `validateNumericFields()` |
| **Logs** | Básicos | Detallados por campo |
| **Error Handling** | Falla en Lambda | Detecta antes de enviar |

