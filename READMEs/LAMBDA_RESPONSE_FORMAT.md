# 🔢 Formato de Respuesta Lambda

## 📊 Formato de Predicción

### Entrada de Lambda (formato complejo)

```json
["[1006320.92788917]"]
```

Este formato anidado se procesa automáticamente para extraer el valor numérico.

### Salida Formateada (número limpio)

```javascript
1006321  // Redondeado hacia arriba con Math.ceil()
```

---

## 🔄 Proceso de Formateo

### Función `formatPredictionValue()`

La función realiza los siguientes pasos:

```typescript
// Entrada: ["[1006320.92788917]"]

// 1. Extraer primer elemento del array externo
value = value[0]  // → "[1006320.92788917]"

// 2. Remover corchetes del string
value = value.replace(/[\[\]]/g, "")  // → "1006320.92788917"

// 3. Convertir a número
value = parseFloat(value)  // → 1006320.92788917

// 4. Redondear hacia arriba
value = Math.ceil(value)  // → 1006321
```

---

## 📤 Respuesta de la API

### Con Min/Max (2 invocaciones)

```json
{
  "predictionMin": 950000,
  "predictionMax": 1200000
}
```

### Con Valor Único (1 invocación)

```json
{
  "prediction": 1050000
}
```

---

## 🧪 Ejemplos

### Ejemplo 1: Request con Min/Max

**Request:**
```json
{
  "barrio": "Palermo",
  "metrosCuadradosMin": 50,
  "metrosCuadradosMax": 80,
  "dormitorios": 2
}
```

**Lambda Response (raw):**
- MIN: `["[950320.45678912]"]`
- MAX: `["[1199876.23456789]"]`

**API Response (formateada):**
```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877
}
```

### Ejemplo 2: Request con Valor Único

**Request:**
```json
{
  "barrio": "Belgrano",
  "total_area": 65,
  "dormitorios": 2
}
```

**Lambda Response (raw):**
`["[1050123.98765432]"]`

**API Response (formateada):**
```json
{
  "prediction": 1050124
}
```

---

## 🔍 Logs del Servidor

Cuando se procesan las predicciones, verás:

```
🚀 Invocando Lambda: rent-prediction-function
📦 Request Body Original: { "barrio": "Palermo", ... }
🔄 Detectados valores min y max - Se invocarán 2 predicciones
📦 Invocando Lambda (MIN) con área: 50m²
📦 Invocando Lambda (MAX) con área: 80m²
✅ Predicción MIN (formateada): 950321
✅ Predicción MAX (formateada): 1199877
```

---

## ⚙️ Configuración

### Variable de Entorno

Asegúrate de usar el nombre correcto en tu `.env`:

```bash
AWS_SECRET_ACCESS_KEY_ID=your-secret-key
```

**Nota:** Este proyecto usa `AWS_SECRET_ACCESS_KEY_ID` (con `_ID` al final) en lugar del estándar de AWS `AWS_SECRET_ACCESS_KEY`.

---

## 🐛 Troubleshooting

### Error: "No se pudo parsear el valor de predicción"

**Causa:** La respuesta de Lambda no tiene el formato esperado.

**Solución:**
1. Verificar logs de Lambda en CloudWatch
2. Verificar que Lambda retorna el campo `prediction`
3. Probar Lambda directamente con AWS CLI

### Valor retornado es 0

**Causa:** Error en el parsing o respuesta inválida.

**Solución:**
1. Revisar logs del servidor para ver el valor raw
2. Verificar que Lambda está retornando datos válidos
3. Verificar formato de respuesta de Lambda

---

## 📚 Código Relevante

```typescript
// src/services/RentService.ts

private formatPredictionValue(predictionValue: any): number {
  try {
    let value = predictionValue;
    
    // Extraer del array externo
    if (Array.isArray(value) && value.length > 0) {
      value = value[0];
    }
    
    // Limpiar string
    if (typeof value === "string") {
      value = value.replace(/[\[\]]/g, "");
      value = parseFloat(value);
    }
    
    // Convertir a número
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      console.error("❌ No se pudo parsear:", predictionValue);
      return 0;
    }
    
    // Redondear hacia arriba
    return Math.ceil(numValue);
    
  } catch (error) {
    console.error("❌ Error formateando:", error);
    return 0;
  }
}
```

---

✅ **Las predicciones se formatean automáticamente y se redondean hacia arriba!**

