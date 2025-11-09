# 📸 Integración de Imágenes desde S3

## 📋 Descripción

El sistema ahora obtiene automáticamente las URLs de imágenes de reportes almacenadas en un bucket de S3 y las incluye en la respuesta de predicción.

### 🗂️ Estructura de Carpetas en S3

```
s3://your-bucket-name/
└── reporting/
    └── report_pictures/
        └── MM_AAAA/              ← Mes y año (ej: 01_2025)
            └── NOMBRE_BARRIO/    ← Barrio normalizado (ej: PALERMO)
                ├── image1.jpg
                ├── image2.png
                └── image3.webp
```

**Ejemplo de path completo:**
```
s3://observatorio-bucket/reporting/report_pictures/01_2025/PALERMO/grafico_precio.png
```

---

## 🔧 Configuración

### Variables de Entorno

Agrega en tu `.env`:

```bash
# AWS Configuration (ya configurado para Lambda)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY_ID=your-aws-secret-access-key

# S3 Bucket
BUCKET_NAME=your-bucket-name
```

### Permisos IAM Requeridos

El usuario/role de IAM necesita permisos para listar objetos en S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/reporting/report_pictures/*"
      ]
    }
  ]
}
```

---

## 📤 Request & Response

### Request (sin cambios)

```bash
curl -X POST http://localhost:9000/rent/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "barrio": "Palermo",
    "metrosCuadradosMin": 50,
    "metrosCuadradosMax": 80,
    "dormitorios": 2
  }'
```

### Response con Imágenes (2 invocaciones)

```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877,
  "images": {
    "price_by_m2_evolution": "https://bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/price_by_m2_evolution.png",
    "price_evolution": "https://bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/price_evolution.png",
    "bar_price_by_amb": "https://bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/bar_price_by_amb.png",
    "bar_m2_price_by_amb": "https://bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/bar_m2_price_by_amb.png",
    "bar_price_by_amb_neighborhood": null,
    "bar_m2_price_by_amb_neighborhood": null,
    "pie_property_amb_distribution": "https://bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/pie_property_amb_distribution.png",
    "pie_property_m2_distribution_neighborhood": null,
    "pie_property_amb_distribution_neighborhood": null
  }
}
```

### Response con Imágenes (1 invocación)

```json
{
  "prediction": 1050124,
  "otros_campos": "...",
  "images": {
    "price_by_m2_evolution": "https://bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/BELGRANO/price_by_m2_evolution.png",
    "price_evolution": "https://bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/BELGRANO/price_evolution.png",
    "bar_price_by_amb": null,
    "bar_m2_price_by_amb": null,
    "bar_price_by_amb_neighborhood": null,
    "bar_m2_price_by_amb_neighborhood": null,
    "pie_property_amb_distribution": null,
    "pie_property_m2_distribution_neighborhood": null,
    "pie_property_amb_distribution_neighborhood": null
  }
}
```

### Response sin Imágenes Disponibles

Si no hay imágenes en el bucket para ese barrio/mes, todas las keys tendrán `null`:

```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877,
  "images": {
    "price_by_m2_evolution": null,
    "price_evolution": null,
    "bar_price_by_amb": null,
    "bar_m2_price_by_amb": null,
    "bar_price_by_amb_neighborhood": null,
    "bar_m2_price_by_amb_neighborhood": null,
    "pie_property_amb_distribution": null,
    "pie_property_m2_distribution_neighborhood": null,
    "pie_property_amb_distribution_neighborhood": null
  }
}
```

---

## 🖼️ Keys de Imágenes

El objeto `images` siempre contiene las siguientes 9 keys:

| Key | Descripción | Nombre de Archivo Esperado |
|-----|-------------|---------------------------|
| `price_by_m2_evolution` | Evolución del precio por m² | `price_by_m2_evolution.png` |
| `price_evolution` | Evolución general de precios | `price_evolution.png` |
| `bar_price_by_amb` | Gráfico de barras: precio por ambiente | `bar_price_by_amb.png` |
| `bar_m2_price_by_amb` | Gráfico de barras: precio m² por ambiente | `bar_m2_price_by_amb.png` |
| `bar_price_by_amb_neighborhood` | Barras: precio por ambiente y barrio | `bar_price_by_amb_neighborhood.png` |
| `bar_m2_price_by_amb_neighborhood` | Barras: precio m² por ambiente y barrio | `bar_m2_price_by_amb_neighborhood.png` |
| `pie_property_amb_distribution` | Torta: distribución de propiedades por ambiente | `pie_property_amb_distribution.png` |
| `pie_property_m2_distribution_neighborhood` | Torta: distribución m² por barrio | `pie_property_m2_distribution_neighborhood.png` |
| `pie_property_amb_distribution_neighborhood` | Torta: distribución ambiente por barrio | `pie_property_amb_distribution_neighborhood.png` |

**Notas:**
- Si una imagen no existe en S3, su valor será `null`
- El sistema mapea automáticamente los nombres de archivo a las keys
- Los nombres de archivo pueden usar guiones (`-`) o guiones bajos (`_`)
- La extensión puede ser `.png`, `.jpg`, `.jpeg`, `.gif`, o `.webp`

---

## 🔍 Normalización de Nombres de Barrio

El sistema normaliza automáticamente los nombres de barrios para buscar en S3:

| Input (Request) | Normalizado (S3) |
|-----------------|------------------|
| `"Palermo"` | `PALERMO` |
| `"Palermo Soho"` | `PALERMO_SOHO` |
| `"Villa Urquiza"` | `VILLA_URQUIZA` |
| `"Núñez"` | `NUNEZ` |
| `"Barrio Chino"` | `BARRIO_CHINO` |

### Reglas de Normalización

1. **Remover acentos:** "Núñez" → "Nunez"
2. **Convertir a mayúsculas:** "palermo" → "PALERMO"
3. **Reemplazar espacios por `_`:** "Palermo Soho" → "PALERMO_SOHO"
4. **Remover caracteres especiales:** "Barrio-Norte" → "BARRIONORTE"

---

## 📅 Carpetas por Fecha

Las imágenes se organizan por mes y año:

| Fecha Actual | Carpeta en S3 |
|--------------|---------------|
| Enero 2025 | `01_2025/` |
| Febrero 2025 | `02_2025/` |
| Diciembre 2024 | `12_2024/` |

El sistema **siempre busca en la carpeta del mes actual**.

---

## 🖼️ Formatos de Imagen Soportados

El sistema filtra y retorna solo archivos con estas extensiones:

- ✅ `.jpg` / `.jpeg`
- ✅ `.png`
- ✅ `.gif`
- ✅ `.webp`

Otros archivos en la carpeta (`.pdf`, `.txt`, etc.) son ignorados.

---

## 📊 Ejemplo Completo

### 1. Estructura en S3

```
s3://observatorio-inmobiliario-bucket/
└── reporting/
    └── report_pictures/
        └── 01_2025/
            ├── PALERMO/
            │   ├── grafico_precio_promedio.png
            │   ├── mapa_calor.jpg
            │   └── tendencia_mensual.webp
            ├── BELGRANO/
            │   ├── comparativa_barrios.png
            │   └── distribucion.jpg
            └── RECOLETA/
                └── analisis_precios.png
```

### 2. Request

```json
{
  "barrio": "Palermo",
  "metrosCuadradosMin": 50,
  "metrosCuadradosMax": 80,
  "dormitorios": 2,
  "banos": 1
}
```

### 3. Logs del Servidor

```
🚀 Invocando Lambda: rent-prediction-function
📦 Request Body Original: { "barrio": "Palermo", ... }
🔄 Detectados valores min y max - Se invocarán 2 predicciones
📦 Invocando Lambda (MIN) con área: 50m²
📦 Invocando Lambda (MAX) con área: 80m²
✅ Predicción MIN (formateada): 950321
✅ Predicción MAX (formateada): 1199877
📸 Buscando imágenes en S3: s3://observatorio-inmobiliario-bucket/reporting/report_pictures/01_2025/PALERMO/
  ✓ price_by_m2_evolution: price_by_m2_evolution
  ✓ price_evolution: price_evolution
  ✓ bar_price_by_amb: bar_price_by_amb
✅ Se mapearon 3 de 9 imágenes posibles
```

### 4. Response

```json
{
  "predictionMin": 950321,
  "predictionMax": 1199877,
  "images": {
    "price_by_m2_evolution": "https://observatorio-inmobiliario-bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/price_by_m2_evolution.png",
    "price_evolution": "https://observatorio-inmobiliario-bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/price_evolution.png",
    "bar_price_by_amb": "https://observatorio-inmobiliario-bucket.s3.us-east-1.amazonaws.com/reporting/report_pictures/01_2025/PALERMO/bar_price_by_amb.png",
    "bar_m2_price_by_amb": null,
    "bar_price_by_amb_neighborhood": null,
    "bar_m2_price_by_amb_neighborhood": null,
    "pie_property_amb_distribution": null,
    "pie_property_m2_distribution_neighborhood": null,
    "pie_property_amb_distribution_neighborhood": null
  }
}
```

---

## 🔒 Acceso a Imágenes

### Opción A: Bucket Público (Más Simple)

Si el bucket es público, las URLs funcionan directamente:

```
https://your-bucket-name.s3.us-east-1.amazonaws.com/path/to/image.png
```

### Opción B: Bucket Privado con Presigned URLs (Más Seguro)

Si el bucket es privado, necesitas generar presigned URLs. Para implementar esto:

```typescript
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Generar URL firmada que expira en 1 hora
const command = new GetObjectCommand({
  Bucket: this.bucketName,
  Key: imageKey,
});

const signedUrl = await getSignedUrl(this.s3Client, command, { 
  expiresIn: 3600 
});
```

**Para habilitar presigned URLs, instala:**
```bash
npm install @aws-sdk/s3-request-presigner
```

---

## 🐛 Troubleshooting

### No se encuentran imágenes (array vacío)

**Posibles causas:**

1. **Carpeta del mes no existe:**
   - Verifica que existe: `reporting/report_pictures/01_2025/PALERMO/`
   - El sistema busca en el mes actual

2. **Nombre de barrio no coincide:**
   - Input: `"Palermo Soho"`
   - Buscando en: `PALERMO_SOHO/`
   - Verifica la normalización

3. **BUCKET_NAME no configurado:**
   ```
   ⚠️  BUCKET_NAME no está configurado, no se pueden obtener imágenes
   ```

4. **Permisos insuficientes:**
   ```
   ❌ Error obteniendo imágenes de S3: AccessDenied
   ```
   → Verificar permisos IAM

### Imágenes no son accesibles (403 Forbidden)

**Causa:** El bucket es privado y las URLs no están firmadas.

**Solución:**
1. Hacer el bucket público (para desarrollo)
2. Implementar presigned URLs (para producción)
3. Configurar CORS en el bucket

### Bucket CORS Configuration (si es necesario)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

---

## ⚙️ Configuración del Bucket S3

### Crear Bucket

```bash
aws s3 mb s3://observatorio-inmobiliario-bucket --region us-east-1
```

### Subir Imágenes

```bash
# Estructura recomendada
aws s3 cp grafico.png \
  s3://observatorio-inmobiliario-bucket/reporting/report_pictures/01_2025/PALERMO/grafico.png
```

### Hacer Bucket Público (opcional, para desarrollo)

```bash
aws s3api put-bucket-policy \
  --bucket observatorio-inmobiliario-bucket \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::observatorio-inmobiliario-bucket/reporting/report_pictures/*"
    }]
  }'
```

---

## 📚 Código Relevante

### Método Principal

```typescript
// src/services/RentService.ts

private async getReportImages(barrio: string): Promise<Record<string, string | null>> {
  // Estructura con todas las keys posibles
  const imageMap = {
    price_by_m2_evolution: null,
    price_evolution: null,
    bar_price_by_amb: null,
    bar_m2_price_by_amb: null,
    bar_price_by_amb_neighborhood: null,
    bar_m2_price_by_amb_neighborhood: null,
    pie_property_amb_distribution: null,
    pie_property_m2_distribution_neighborhood: null,
    pie_property_amb_distribution_neighborhood: null,
  };
  
  // 1. Validar configuración
  if (!this.bucketName || !barrio) return imageMap;
  
  // 2. Construir path con fecha y barrio normalizado
  const dateFolder = "01_2025"; // Mes actual
  const normalizedBarrio = this.normalizeBarrioName(barrio);
  const prefix = `reporting/report_pictures/${dateFolder}/${normalizedBarrio}/`;
  
  // 3. Listar objetos en S3
  const response = await this.s3Client.send(
    new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix
    })
  );
  
  // 4. Mapear cada archivo a su key correspondiente
  for (const item of response.Contents) {
    const fileName = item.Key.split('/').pop()?.split('.')[0];
    const imageUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com/${item.Key}`;
    const mappedKey = this.mapFileNameToKey(fileName);
    
    if (mappedKey) {
      imageMap[mappedKey] = imageUrl;
    }
  }
  
  return imageMap;
}
```

---

## 🎯 Ventajas

✅ **Automático:** Las imágenes se incluyen sin cambios en el request  
✅ **Flexible:** Si no hay imágenes, retorna array vacío  
✅ **Organizado:** Estructura de carpetas por fecha y barrio  
✅ **Escalable:** Soporta múltiples barrios y meses  
✅ **Robusto:** No falla si el bucket no está configurado  

---

## 📚 Referencias

- [AWS SDK S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [S3 Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
- [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

---

✅ **Las imágenes de reportes se incluyen automáticamente en las predicciones!**

