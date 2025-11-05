# 🔧 Fix: Error de Tipo en Campo 'neighborhood' para Lambda

## Problema Reportado

Al enviar una predicción con el campo `barrio: "RECOLETA"`, Lambda devolvía el siguiente error:

```
❌ Error invocando Lambda: Error: Lambda returned status 400: 
{"error": "Field 'neighborhood' must be a string."}
```

### Síntoma
```bash
POST /rent/predict
{
  "barrio": "RECOLETA",
  "ambientes": 3,
  // ...
}

Response: 400
Lambda Error: Field 'neighborhood' must be a string.
```

## Causa Raíz

Había **dos problemas relacionados** en el mapeo de barrios:

### 1. Tipo de Retorno Permitía `null`

El método `mapNeighborhood` tenía un tipo de retorno `string | null`, que permitía devolver `null` cuando el barrio no se encontraba en el mapeo:

```typescript
// ANTES (❌)
private mapNeighborhood(barrio: string): string | null {
  if (!barrio) return null;  // ❌ Podía devolver null
  
  const mapping = { /* ... */ };
  return mapping[normalized] || null;  // ❌ Podía devolver null
}
```

Cuando `null` se enviaba a Lambda en el campo `neighborhood`, Lambda lo rechazaba porque **esperaba un string**.

### 2. Sin Conversión Explícita a String

El payload no garantizaba que el campo `neighborhood` fuera un string válido:

```typescript
// ANTES (❌)
const payload = {
  neighborhood: mappedNeighborhood,  // Podía ser null
  // ...
};
```

Si `mappedNeighborhood` era `null`, se enviaba directamente a Lambda como:
```json
{
  "neighborhood": null  // ❌ Lambda rechaza esto
}
```

## Solución Implementada

Se aplicaron **tres cambios** para garantizar que `neighborhood` siempre sea un string válido:

### 1. Cambio del Tipo de Retorno

El método `mapNeighborhood` ahora **siempre devuelve un string**:

```typescript
// DESPUÉS (✅)
private mapNeighborhood(barrio: string): string {
  if (!barrio) {
    logger.warning("⚠️  Barrio vacío recibido en mapNeighborhood");
    return "";  // ✅ Devuelve string vacío en lugar de null
  }

  const normalized = barrio.toLowerCase().trim();
  const mapping = { /* ... */ };
  const mapped = mapping[normalized];
  
  if (!mapped) {
    logger.warning(`⚠️  Barrio "${barrio}" no encontrado en mapeo. Usando valor original.`);
    // ✅ Si no se encuentra, capitalizar el barrio original
    return barrio.charAt(0).toUpperCase() + barrio.slice(1).toLowerCase();
  }
  
  return mapped;  // ✅ Siempre devuelve string
}
```

**Beneficios:**
- Nunca devuelve `null`
- Si el barrio no está en el mapeo, capitaliza el valor original (ej: "RECOLETA" → "Recoleta")
- Logs de warning cuando un barrio no se encuentra en el mapeo

### 2. Conversión Explícita a String en Payload

Se añadió conversión explícita de todos los campos a sus tipos correctos:

```typescript
// DESPUÉS (✅)
const payload = {
  total_area: Number(body.total_area || body.metrosCuadrados || body.surface_total),
  rooms: Number(body.ambientes || body.rooms),
  bedrooms: Number(body.dormitorios || body.bedrooms),
  antiquity: Number(body.antiguedad || body.antiquity || body.age),
  neighborhood: String(mappedNeighborhood), // ✅ Conversión explícita a string
  bathrooms: Number(body.banos || body.bathrooms),
  garages: Number(body.garajes || body.garages),
};
```

### 3. Validación Adicional de Neighborhood

Se añadió validación explícita para casos extremos:

```typescript
// ✅ Validar que neighborhood sea un string válido
if (!payload.neighborhood || 
    payload.neighborhood === "null" || 
    payload.neighborhood === "undefined") {
  logger.warning(`⚠️  Neighborhood vacío o inválido. Barrio original: "${barrio}"`);
  payload.neighborhood = barrio || ""; // Fallback al barrio original
}
```

Esto previene casos donde:
- `neighborhood` sea un string vacío
- `neighborhood` sea la string literal "null" o "undefined"

### 4. Logs Mejorados para Depuración

Se añadieron logs detallados para rastrear el mapeo de barrios:

```typescript
logger.debug(`🏘️  Barrio recibido: "${barrio}" (tipo: ${typeof barrio})`);
logger.debug(`🏘️  Barrio mapeado: "${mappedNeighborhood}" (tipo: ${typeof mappedNeighborhood})`);
logger.debug("📦 Payload mapeado para Lambda:", JSON.stringify(payload, null, 2));
logger.debug(`📦 Tipo de neighborhood en payload: ${typeof payload.neighborhood}`);
```

## Ejemplos de Funcionamiento

### Caso 1: Barrio en el Mapeo

```bash
Request:
{
  "barrio": "RECOLETA"
}

Logs:
🏘️  Barrio recibido: "RECOLETA" (tipo: string)
🏘️  Barrio mapeado: "Recoleta" (tipo: string)

Lambda Payload:
{
  "neighborhood": "Recoleta"  // ✅ String válido
}
```

### Caso 2: Barrio NO en el Mapeo

```bash
Request:
{
  "barrio": "SAN NICOLAS"
}

Logs:
🏘️  Barrio recibido: "SAN NICOLAS" (tipo: string)
⚠️  Barrio "SAN NICOLAS" no encontrado en mapeo. Usando valor original.
🏘️  Barrio mapeado: "San nicolas" (tipo: string)

Lambda Payload:
{
  "neighborhood": "San nicolas"  // ✅ String capitalizado, no null
}
```

### Caso 3: Barrio Vacío

```bash
Request:
{
  "barrio": ""
}

Logs:
🏘️  Barrio recibido: "" (tipo: string)
⚠️  Barrio vacío recibido en mapNeighborhood
🏘️  Barrio mapeado: "" (tipo: string)

Lambda Payload:
{
  "neighborhood": ""  // ✅ String vacío, no null
}
```

## Flujo Corregido

```
Usuario envía: barrio: "RECOLETA"
       ↓
mapNeighborhood("RECOLETA")
  → normaliza: "recoleta"
  → busca en mapping: encontrado ✅
  → devuelve: "Recoleta" (string)
       ↓
String(mappedNeighborhood)
  → garantiza tipo string
       ↓
Validación adicional
  → verifica que no sea vacío/null/undefined
       ↓
Lambda recibe: { "neighborhood": "Recoleta" } ✅
```

## Barrios Soportados (Mapeo Completo)

El mapeo actual incluye los siguientes barrios:

| Input (case-insensitive) | Output (Formato Lambda) |
|--------------------------|-------------------------|
| palermo | Palermo |
| palermo soho | Palermo |
| palermo hollywood | Palermo |
| belgrano | Belgrano |
| recoleta | Recoleta |
| caballito | Caballito |
| villa crespo | Villa Crespo |
| colegiales | Colegiales |
| nunez / núñez | Núñez |
| puerto madero | Puerto Madero |
| san telmo | San Telmo |
| monserrat | Monserrat |
| retiro | Retiro |
| barrio norte | Barrio Norte |
| almagro | Almagro |
| boedo | Boedo |
| flores | Flores |
| parque patricios | Parque Patricios |
| villa urquiza | Villa Urquiza |
| saavedra | Saavedra |
| villa devoto | Villa Devoto |
| villa del parque | Villa del Parque |

**Nota:** Si un barrio no está en el mapeo, se capitaliza automáticamente el valor original.

## Debugging

Si sigues teniendo problemas con barrios, revisa los logs con `LOG_LEVEL=DEBUG`:

```bash
# En .env
LOG_LEVEL=DEBUG

# Reinicia la aplicación
pm2 restart observatorio-inmobiliario-api

# Verifica los logs
pm2 logs observatorio-inmobiliario-api --lines 100
```

Busca estas líneas en los logs:
```
🏘️  Barrio recibido: "..."
🏘️  Barrio mapeado: "..."
📦 Payload mapeado para Lambda: {...}
📦 Tipo de neighborhood en payload: string
```

## Testing

### Test 1: Barrio Válido (en mapeo)

```bash
POST /rent/predict
{
  "barrio": "RECOLETA",
  "ambientes": 3,
  "metrosCuadradosMin": 50,
  "metrosCuadradosMax": 80,
  "dormitorios": 2,
  "banos": 1,
  "garajes": 1,
  "antiguedad": 5,
  "calle": "Avenida Callao 1234"
}

Expected: 200 OK con predicción exitosa ✅
```

### Test 2: Barrio Válido (NO en mapeo)

```bash
POST /rent/predict
{
  "barrio": "SAN NICOLAS",
  // ... resto de campos
}

Expected: 
- 200 OK con predicción exitosa ✅
- Log warning: "Barrio SAN NICOLAS no encontrado en mapeo"
- Lambda recibe: "San nicolas"
```

### Test 3: Barrio con Mayúsculas/Minúsculas

```bash
POST /rent/predict
{
  "barrio": "pAlErMo",
  // ... resto de campos
}

Expected: 
- 200 OK ✅
- Lambda recibe: "Palermo"
```

## Archivos Modificados

1. **`src/utils/AwsAdapter.ts`**
   - Método `mapNeighborhood`: Cambio de tipo `string | null` a `string`
   - Método `mapNeighborhood`: Capitalización de barrios no encontrados
   - Método `mapRequestToLambdaPayload`: Conversión explícita a `String()`
   - Método `mapRequestToLambdaPayload`: Validación adicional de neighborhood
   - Logs de depuración mejorados

## Consideraciones Futuras

### Agregar Más Barrios al Mapeo

Para agregar nuevos barrios, actualiza el mapping en `mapNeighborhood`:

```typescript
const mapping: { [key: string]: string } = {
  // ... barrios existentes ...
  "nuevo barrio": "Nuevo Barrio",  // ✅ Agregar aquí
};
```

### Validación en el Controlador

Opcionalmente, podrías agregar validación en `RentController` antes de llamar a Lambda:

```typescript
const validBarrios = ["Palermo", "Recoleta", "Belgrano", /* ... */];

if (req.body.barrio && !validBarrios.includes(req.body.barrio)) {
  logger.warning(`Barrio no válido recibido: ${req.body.barrio}`);
  // Decidir si rechazar o permitir
}
```

## Referencias

- [AWS Lambda Payload Specification](https://docs.aws.amazon.com/lambda/latest/dg/lambda-invocation.html)
- Issue relacionado: AWS_CREDENTIALS_FIX.md (credenciales para invocar Lambda)

