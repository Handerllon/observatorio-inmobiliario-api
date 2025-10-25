# 📊 Integración de Datos Estadísticos desde S3

## Overview

Sistema para integrar información estadística de los barrios en las predicciones de alquiler, utilizando archivos parquet almacenados en S3.

---

## 📂 Ubicación de los Archivos

Los archivos estadísticos se encuentran en S3 en la siguiente ruta:

```
s3://{BUCKET_NAME}/data/stg/zonaprop/
```

**Formato:** Archivos Parquet (`.parquet`)

---

## 🔧 Implementación Actual

### 1. Método de Listado de Archivos

**Ubicación:** `src/services/RentService.ts`

```typescript
async listStatisticalParquetFiles(): Promise<Array<{
  key: string;
  fileName: string;
  size: number;
  lastModified: Date | undefined;
}>>
```

**Funcionalidad:**
- Lista todos los archivos `.parquet` en `data/stg/zonaprop/`
- Filtra automáticamente solo archivos con extensión `.parquet`
- Retorna metadatos de cada archivo (nombre, tamaño, fecha de modificación)
- Manejo de errores robusto

**Características:**
- ✅ Filtrado automático por extensión `.parquet`
- ✅ Metadatos completos de cada archivo
- ✅ Logs detallados para debugging
- ✅ Manejo de errores graceful

### 2. Uso Interno del Método

El método `listStatisticalParquetFiles()` es **privado/interno** del servicio y se utilizará directamente en el proceso de predicción, sin exponerse como endpoint público.

**Ejemplo de uso interno:**
```typescript
// Dentro de executePrediction() o método similar
const availableFiles = await this.listStatisticalParquetFiles();

// Seleccionar archivo relevante basado en fecha o barrio
const relevantFile = availableFiles.find(f => 
  f.fileName.includes('2025_01')
);

// Leer y procesar el archivo
if (relevantFile) {
  const statistics = await this.readParquetFile(relevantFile.key);
  // ... usar estadísticas en la respuesta
}
```

**Retorna:**
```typescript
Array<{
  key: string;              // "data/stg/zonaprop/propiedades_2025_01.parquet"
  fileName: string;         // "propiedades_2025_01.parquet"
  size: number;             // Bytes
  lastModified: Date | undefined;
}>
```

---

## 📋 Próximos Pasos

### Fase 1: Exploración ✅ (COMPLETADA)
- [x] Implementar método de listado de archivos
- [x] Método interno en `RentService`
- [x] Logs y manejo de errores

### Fase 2: Lectura de Archivos Parquet (SIGUIENTE)
- [ ] Instalar librería para leer parquet (ej: `parquetjs`, `apache-arrow`)
- [ ] Implementar método de lectura de archivos
- [ ] Parsear datos de parquet a JSON
- [ ] Identificar estructura de los datos

### Fase 3: Filtrado y Procesamiento
- [ ] Implementar filtrado por barrio
- [ ] Implementar filtrado por fecha/mes
- [ ] Calcular estadísticas agregadas
- [ ] Cachear resultados frecuentes

### Fase 4: Integración con Predicción
- [ ] Agregar campo `statistics` a la respuesta de predicción
- [ ] Incluir datos estadísticos relevantes del barrio
- [ ] Actualizar documentación de API
- [ ] Actualizar entidad `RentPrediction` para guardar estadísticas

---

## 🗂️ Estructura Esperada de Archivos Parquet

**Pendiente:** Una vez que listemos los archivos y leamos uno de ejemplo, documentar aquí:

- Nombres de archivos disponibles
- Estructura de columnas
- Tipos de datos
- Filtros disponibles (barrio, fecha, etc.)
- Volumen de datos

---

## 🎯 Objetivo Final

Incluir en la respuesta de predicción información estadística del barrio:

```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877,
  "images": {...},
  "input_data": {...},
  "statistics": {
    "barrio": "Palermo",
    "periodo": "2025-01",
    "inmueblesDisponibles": 234,
    "precioPromedio": 1050000,
    "precioMediano": 980000,
    "metrosCuadradosPromedio": 65,
    "ambientesPromedio": 2.5,
    "tendenciaPrecio": "+5.2%",  // vs mes anterior
    "ofertaNueva": 45,            // nuevas publicaciones
    "ofertaRemovida": 32,         // publicaciones removidas
    "diasPromedioPublicacion": 28
  }
}
```

---

## 📦 Dependencias Necesarias

### Para Leer Archivos Parquet

**Opción 1: parquetjs** (Node.js nativo)
```bash
npm install parquetjs
```

**Pros:**
- Librería Node.js pura
- Fácil integración
- Bien documentada

**Contras:**
- Performance media para archivos grandes
- Funcionalidad limitada

**Opción 2: Apache Arrow** (Recomendado)
```bash
npm install apache-arrow
```

**Pros:**
- Alto rendimiento
- Soporte completo de Parquet
- Manejo eficiente de memoria
- Usado por la industria

**Contras:**
- Más complejo de usar
- Dependencia nativa (puede requerir compilación)

**Opción 3: AWS Athena** (Serverless)
- Consultar archivos Parquet directamente con SQL
- Sin necesidad de leer archivos completos
- Costo por consulta
- Más lento (latencia de consulta)

---

## 🧪 Testing

### 1. Verificar Listado de Archivos

Como el método es interno, puedes probarlo directamente desde el código:

```typescript
// En cualquier lugar donde tengas acceso a RentService
const rentService = new RentService();
const files = await rentService.listStatisticalParquetFiles();
console.log(`Archivos encontrados: ${files.length}`);
files.forEach(f => console.log(`  - ${f.fileName}`));
```

O mediante logs durante la ejecución de una predicción (verás los logs en consola).

### 2. Verificar Permisos S3

El usuario/rol de IAM necesita:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:ListBucket",
    "s3:GetObject"
  ],
  "Resource": [
    "arn:aws:s3:::your-bucket-name",
    "arn:aws:s3:::your-bucket-name/data/stg/zonaprop/*"
  ]
}
```

---

## 🚨 Consideraciones

### Performance

- **Archivos grandes:** Los archivos parquet pueden ser muy grandes
- **Cache:** Considerar cachear estadísticas calculadas (Redis)
- **Carga bajo demanda:** Solo leer archivos cuando sea necesario
- **Filtrado eficiente:** Usar índices de parquet si están disponibles

### Memoria

- No cargar archivos completos en memoria
- Leer por chunks/batches
- Liberar memoria después de procesar

### Costos

- **Transferencia S3:** Se cobra por cada GB transferido
- **Requests S3:** Se cobra por cada GET request
- **Athena:** Se cobra por cada TB escaneado (si se usa)

### Escalabilidad

- Considerar pipeline de procesamiento asíncrono
- Pre-calcular estadísticas agregadas
- Almacenar resultados en base de datos

---

## 📝 Logs y Debugging

### Logs Actuales

```
📊 Listando archivos parquet en S3: s3://bucket/data/stg/zonaprop/
✅ Se encontraron 5 archivos parquet:
  - propiedades_2025_01.parquet (1234.56 KB) - Modificado: 2025-01-24T15:30:00.000Z
  - estadisticas_barrios.parquet (567.89 KB) - Modificado: 2025-01-20T10:15:00.000Z
```

### Variables de Entorno

Usar las mismas que para S3:
- `BUCKET_NAME`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY_ID`

---

## 🔄 Flujo de Integración

```
Usuario solicita predicción
         ↓
Invocar Lambda (predicción ML)
         ↓
Obtener imágenes de S3 ← YA IMPLEMENTADO
         ↓
Listar archivos parquet disponibles ← FASE ACTUAL
         ↓
Leer archivo parquet relevante ← PRÓXIMO PASO
         ↓
Filtrar por barrio y fecha
         ↓
Calcular estadísticas agregadas
         ↓
Incluir en respuesta final
         ↓
Retornar al usuario
```

---

## 📚 Referencias

- [Apache Parquet Format](https://parquet.apache.org/)
- [parquetjs Documentation](https://github.com/ironSource/parquetjs)
- [Apache Arrow JavaScript](https://arrow.apache.org/docs/js/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)

---

## ✅ Estado Actual

**Fase 1: Listado de Archivos** ✅ COMPLETADA

- ✅ Método `listStatisticalParquetFiles()` implementado en `RentService`
- ✅ Método interno (no expuesto como endpoint)
- ✅ Logs detallados agregados
- ✅ Manejo de errores implementado
- ✅ Listo para integración en proceso de predicción

**Siguiente:** Leer contenido de archivos parquet y entender su estructura.

---

**Fecha de última actualización:** 2025-01-24

