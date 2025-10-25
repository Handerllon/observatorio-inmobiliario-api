import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { 
  LocationClient, 
  SearchPlaceIndexForTextCommand
} from "@aws-sdk/client-location";

/**
 * Adapter para todas las interacciones con servicios de AWS
 * - Lambda: Invocación de funciones de machine learning
 * - S3: Lectura de objetos (imágenes, archivos parquet, métricas)
 * - Location: Geocodificación de direcciones (solo coordenadas)
 */
export class AwsAdapter {
  private lambdaClient: LambdaClient;
  private s3Client: S3Client;
  private locationClient: LocationClient;
  private lambdaFunctionName: string;
  private bucketName: string;
  private placeIndexName: string;

  constructor() {
    const region = process.env.AWS_REGION || "us-east-1";
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_ID || "",
    };

    // Configurar clientes AWS
    this.lambdaClient = new LambdaClient({ region, credentials });
    this.s3Client = new S3Client({ region, credentials });
    this.locationClient = new LocationClient({ region, credentials });

    // Variables de configuración
    this.lambdaFunctionName = process.env.LAMBDA_PREDICTION_FUNCTION_NAME || "rent-prediction-function";
    this.bucketName = process.env.BUCKET_NAME || "";
    this.placeIndexName = process.env.AWS_LOCATION_PLACE_INDEX || "observatorio-places";

    // Validar configuración al inicializar
    this.validateConfiguration();
  }

  /**
   * Valida que todas las variables de entorno necesarias estén configuradas
   */
  private validateConfiguration(): void {
    const required = [
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY_ID",
      "LAMBDA_PREDICTION_FUNCTION_NAME",
      "BUCKET_NAME",
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.warn(`⚠️  Variables de entorno faltantes: ${missing.join(", ")}`);
    }
  }

  // ==================== LAMBDA METHODS ====================

  /**
   * Ejecuta predicción invocando Lambda
   * Maneja automáticamente si se debe invocar 1 o 2 veces (min/max)
   * 
   * @param body - Parámetros de la predicción
   * @returns Resultado de la predicción con imágenes e input_data
   */
  async executePrediction(body: any): Promise<any> {
    try {
      console.log("🚀 Invocando Lambda:", this.lambdaFunctionName);
      console.log("📦 Request Body Original:", JSON.stringify(body, null, 2));

      // Verificar si hay valores min y max de metros cuadrados
      const hasMinMax = this.hasMinMaxArea(body);

      if (hasMinMax) {
        return await this.executeDualPrediction(body);
      } else {
        return await this.executeSinglePrediction(body);
      }
    } catch (err) {
      console.error("❌ Error ejecutando predicción con Lambda:", err);
      this.handleLambdaError(err);
      throw err;
    }
  }

  /**
   * Ejecuta dos predicciones en paralelo (min y max)
   */
  private async executeDualPrediction(body: any): Promise<any> {
    console.log("🔄 Detectados valores min y max - Se invocarán 2 predicciones");

    // Invocar Lambda dos veces (una para min, otra para max)
    const [resultMin, resultMax] = await Promise.all([
      this.invokeLambdaWithArea(body, "min"),
      this.invokeLambdaWithArea(body, "max")
    ]);

    // Formatear y redondear predicciones
    const predictionMin = this.formatPredictionValue(resultMin["prediction"]);
    const predictionMax = this.formatPredictionValue(resultMax["prediction"]);

    console.log(`✅ Predicción MIN (formateada): ${predictionMin}`);
    console.log(`✅ Predicción MAX (formateada): ${predictionMax}`);

    // Obtener URLs de imágenes del bucket S3
    const barrio = body.barrio || body.neighborhood || "";
    const imageUrls = await this.getReportImages(barrio);

    // Obtener métricas del barrio
    const metrics = await this.getNeighborhoodMetrics(barrio);

    // Preparar datos de entrada para incluir en la respuesta
    const inputData = this.prepareInputData(body);

    return {
      predictionMin: predictionMin,
      predictionMax: predictionMax,
      images: imageUrls,
      metrics: metrics,
      input_data: inputData
    };
  }

  /**
   * Ejecuta una única predicción
   */
  private async executeSinglePrediction(body: any): Promise<any> {
    console.log("📊 Valor único de área - Se invocará 1 predicción");

    const lambdaPayload = this.mapRequestToLambdaPayload(body);
    const result = await this.invokeLambda(lambdaPayload);

    // Obtener URLs de imágenes del bucket S3
    const barrio = body.barrio || body.neighborhood || "";
    const imageUrls = await this.getReportImages(barrio);

    // Obtener métricas del barrio
    const metrics = await this.getNeighborhoodMetrics(barrio);

    // Preparar datos de entrada para incluir en la respuesta
    const inputData = this.prepareInputData(body);

    // Formatear y redondear la predicción
    const formattedPrediction = this.formatPredictionValue(result["prediction"]);

    return {
      prediction: formattedPrediction,
      images: imageUrls,
      metrics: metrics,
      input_data: inputData
    };
  }

  /**
   * Verifica si el request tiene valores min y max de metros cuadrados
   */
  private hasMinMaxArea(body: any): boolean {
    const hasMin = body.metrosCuadradosMin || body.surface_min;
    const hasMax = body.metrosCuadradosMax || body.surface_max;
    
    // Solo si ambos existen y son diferentes
    return hasMin && hasMax && hasMin !== hasMax;
  }

  /**
   * Invoca Lambda con un área específica (min o max)
   */
  private async invokeLambdaWithArea(body: any, type: "min" | "max"): Promise<any> {
    const areaField = type === "min" ? 
      (body.metrosCuadradosMin || body.surface_min) :
      (body.metrosCuadradosMax || body.surface_max);

    console.log(`📤 Invocando Lambda para área ${type.toUpperCase()}: ${areaField}m²`);

    const payload = this.mapRequestToLambdaPayload({
      ...body,
      total_area: areaField,
      metrosCuadrados: areaField
    });

    return await this.invokeLambda(payload);
  }

  /**
   * Invoca la función Lambda con el payload dado
   */
  private async invokeLambda(payload: any): Promise<any> {
    try {
      console.log("📤 Payload enviado a Lambda:", JSON.stringify(payload, null, 2));

      const command = new InvokeCommand({
        FunctionName: this.lambdaFunctionName,
        Payload: JSON.stringify(payload),
      });

      const response = await this.lambdaClient.send(command);

      // Decodificar respuesta
      const responsePayload = new TextDecoder().decode(response.Payload);
      console.log("📥 Respuesta de Lambda:", responsePayload);

      const result = JSON.parse(responsePayload);

      // Verificar si Lambda retornó un error
      if (result.errorMessage || result.errorType) {
        throw new Error(`Lambda Error: ${result.errorMessage || result.errorType}`);
      }

      // Si Lambda retorna con statusCode (formato API Gateway)
      if (result.statusCode) {
        if (result.statusCode !== 200) {
          throw new Error(`Lambda returned status ${result.statusCode}: ${result.body}`);
        }
        return JSON.parse(result.body);
      }

      return result;
    } catch (error) {
      console.error("❌ Error invocando Lambda:", error);
      throw error;
    }
  }

  /**
   * Mapea el request body a los campos esperados por Lambda
   */
  private mapRequestToLambdaPayload(body: any): any {
    // Mapear barrio según tabla
    const barrio = body.barrio || body.neighborhood || "";
    const mappedNeighborhood = this.mapNeighborhood(barrio);

    return {
      total_area: body.total_area || body.metrosCuadrados || body.surface_total,
      rooms: body.ambientes || body.rooms,
      bedrooms: body.dormitorios || body.bedrooms,
      antiquity: body.antiguedad || body.antiquity || body.age,
      neighborhood: mappedNeighborhood,
      bathrooms: body.banos || body.bathrooms,
      garages: body.garajes || body.garages,
    };
  }

  /**
   * Mapea nombres de barrios al formato esperado por el modelo
   */
  private mapNeighborhood(barrio: string): string | null {
    if (!barrio) return null;

    const normalized = barrio.toLowerCase().trim();

    const mapping: { [key: string]: string } = {
      "palermo": "Palermo",
      "palermo soho": "Palermo",
      "palermo hollywood": "Palermo",
      "belgrano": "Belgrano",
      "recoleta": "Recoleta",
      "caballito": "Caballito",
      "villa crespo": "Villa Crespo",
      "colegiales": "Colegiales",
      "nunez": "Núñez",
      "núñez": "Núñez",
      "puerto madero": "Puerto Madero",
      "san telmo": "San Telmo",
      "monserrat": "Monserrat",
      "retiro": "Retiro",
      "barrio norte": "Barrio Norte",
      "almagro": "Almagro",
      "boedo": "Boedo",
      "flores": "Flores",
      "parque patricios": "Parque Patricios",
      "villa urquiza": "Villa Urquiza",
      "saavedra": "Saavedra",
      "villa devoto": "Villa Devoto",
      "villa del parque": "Villa del Parque",
    };

    return mapping[normalized] || null;
  }

  /**
   * Formatea el valor de predicción desde el formato Lambda
   * Convierte: ["[1006320.92788917]"] → 1006321 (redondeado hacia arriba)
   */
  private formatPredictionValue(predictionValue: any): number {
    try {
      let value = predictionValue;

      if (Array.isArray(value) && value.length > 0) {
        value = value[0];
      }

      if (typeof value === "string") {
        value = value.replace(/[\[\]]/g, "");
        value = parseFloat(value);
      }

      if (Array.isArray(value) && value.length > 0) {
        value = value[0];
      }

      const numValue = parseFloat(value);

      if (isNaN(numValue)) {
        console.error("❌ No se pudo parsear el valor de predicción:", predictionValue);
        return 0;
      }

      return Math.ceil(numValue);
    } catch (error) {
      console.error("❌ Error formateando predicción:", error, "Valor:", predictionValue);
      return 0;
    }
  }

  /**
   * Maneja errores específicos de Lambda
   */
  private handleLambdaError(err: any): void {
    if (err.name === "ResourceNotFoundException") {
      throw new Error(`Lambda function '${this.lambdaFunctionName}' no encontrada. Verifica AWS_REGION y LAMBDA_PREDICTION_FUNCTION_NAME.`);
    }

    if (err.name === "InvalidRequestContentException") {
      throw new Error("Payload inválido enviado a Lambda. Verifica el formato de los datos.");
    }

    if (err.message?.includes("credentials")) {
      throw new Error("Credenciales de AWS inválidas. Verifica AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY_ID.");
    }
  }

  // ==================== S3 METHODS ====================

  /**
   * Obtiene las URLs de las imágenes de reporte desde S3
   * Retorna un objeto con 9 keys predefinidas (null si no existen)
   */
  async getReportImages(barrio: string): Promise<{
    price_by_m2_evolution: string | null;
    price_evolution: string | null;
    bar_price_by_amb: string | null;
    bar_m2_price_by_amb: string | null;
    bar_price_by_amb_neighborhood: string | null;
    bar_m2_price_by_amb_neighborhood: string | null;
    pie_property_amb_distribution: string | null;
    pie_property_m2_distribution_neighborhood: string | null;
    pie_property_amb_distribution_neighborhood: string | null;
  }> {
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

    try {
      if (!this.bucketName) {
        console.warn("⚠️  BUCKET_NAME no está configurado, no se pueden obtener imágenes");
        return imageMap;
      }

      if (!barrio) {
        console.warn("⚠️  No se proporcionó nombre de barrio, no se pueden obtener imágenes");
        return imageMap;
      }

      // Obtener fecha actual en formato MM_AAAA
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateFolder = `${month}_${year}`;

      // Normalizar nombre del barrio
      const normalizedBarrio = this.normalizeBarrioName(barrio);

      // Construir path completo
      const prefix = `reporting/report_pictures/${dateFolder}/${normalizedBarrio}/`;

      console.log(`📸 Buscando imágenes en S3: s3://${this.bucketName}/${prefix}`);

      // Listar objetos en S3
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        console.log(`📭 No se encontraron imágenes en: ${prefix}`);
        return imageMap;
      }

      const region = process.env.AWS_REGION || "us-east-1";

      // Mapear cada archivo a su key correspondiente
      for (const item of response.Contents) {
        const key = item.Key || "";

        // Verificar que sea un archivo de imagen
        if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(key)) {
          continue;
        }

        // Extraer nombre del archivo sin extensión
        const fileName = key.split('/').pop()?.split('.')[0] || "";

        // Generar URL pública
        const imageUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;

        // Mapear nombre de archivo a la key correspondiente
        const mappedKey = this.mapFileNameToKey(fileName);
        if (mappedKey && imageMap.hasOwnProperty(mappedKey)) {
          imageMap[mappedKey] = imageUrl;
          console.log(`  ✓ ${mappedKey}: ${fileName}`);
        }
      }

      // Contar imágenes encontradas
      const foundCount = Object.values(imageMap).filter(url => url !== null).length;
      console.log(`✅ Se mapearon ${foundCount} de 9 imágenes posibles`);

      return imageMap;
    } catch (error) {
      console.error("❌ Error obteniendo imágenes de S3:", error);
      return imageMap;
    }
  }

  /**
   * Obtiene las métricas del barrio desde S3
   * Las métricas están en formato JSON en: reporting/metrics/<MM_YYYY>/<BARRIO>/metrics.json
   * 
   * @param barrio - Nombre del barrio
   * @returns Objeto con métricas o null si no existe
   */
  async getNeighborhoodMetrics(barrio: string): Promise<any | null> {
    try {
      if (!this.bucketName) {
        console.warn("⚠️  BUCKET_NAME no está configurado, no se pueden obtener métricas");
        return null;
      }

      if (!barrio) {
        console.warn("⚠️  No se proporcionó nombre de barrio, no se pueden obtener métricas");
        return null;
      }

      // Obtener fecha actual en formato MM_YYYY
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateFolder = `${month}_${year}`;

      // Normalizar nombre del barrio
      const normalizedBarrio = this.normalizeBarrioName(barrio);

      // Construir path completo al archivo metrics.json
      const key = `reporting/metrics/${dateFolder}/${normalizedBarrio}/metrics.json`;

      console.log(`📊 Buscando métricas en S3: s3://${this.bucketName}/${key}`);

      // Obtener el objeto desde S3
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Leer el contenido del archivo
      if (!response.Body) {
        console.log(`📭 No se encontró el archivo de métricas: ${key}`);
        return null;
      }

      // Convertir stream a string
      const bodyString = await response.Body.transformToString();
      
      // Parsear JSON
      const metrics = JSON.parse(bodyString);

      console.log(`✅ Métricas obtenidas exitosamente para ${barrio}`);
      console.log(`📈 Métricas:`, JSON.stringify(metrics, null, 2));

      return metrics;

    } catch (error: any) {
      // Si el archivo no existe (NoSuchKey), no es un error crítico
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        console.log(`📭 Archivo de métricas no encontrado para ${barrio} (esto es normal si no hay datos)`);
        return null;
      }

      console.error("❌ Error obteniendo métricas de S3:", error);
      return null;
    }
  }

  /**
   * Mapea nombres de archivos a las keys del objeto de imágenes
   */
  private mapFileNameToKey(fileName: string): string | null {
    const mapping: { [key: string]: string } = {
      "price_by_m2_evolution": "price_by_m2_evolution",
      "price_evolution": "price_evolution",
      "bar_price_by_amb": "bar_price_by_amb",
      "bar_m2_price_by_amb": "bar_m2_price_by_amb",
      "bar_price_by_amb_neighborhood": "bar_price_by_amb_neighborhood",
      "bar_m2_price_by_amb_neighborhood": "bar_m2_price_by_amb_neighborhood",
      "pie_property_amb_distribution": "pie_property_amb_distribution",
      "pie_property_m2_distribution_neighborhood": "pie_property_m2_distribution_neighborhood",
      "pie_property_amb_distribution_neighborhood": "pie_property_amb_distribution_neighborhood",
    };

    const normalized = fileName.toLowerCase().trim();
    return mapping[normalized] || null;
  }

  /**
   * Lista todos los archivos parquet disponibles en la ubicación de datos estadísticos
   */
  async listStatisticalParquetFiles(): Promise<Array<{
    key: string;
    fileName: string;
    size: number;
    lastModified: Date | undefined;
  }>> {
    try {
      if (!this.bucketName) {
        console.warn("⚠️  BUCKET_NAME no está configurado");
        return [];
      }

      const prefix = "data/stg/zonaprop/";

      console.log(`📊 Listando archivos parquet en S3: s3://${this.bucketName}/${prefix}`);

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        console.log(`📭 No se encontraron archivos en: ${prefix}`);
        return [];
      }

      // Filtrar solo archivos .parquet
      const parquetFiles = response.Contents
        .filter(item => {
          const key = item.Key || "";
          return key.toLowerCase().endsWith('.parquet');
        })
        .map(item => {
          const key = item.Key || "";
          const fileName = key.split('/').pop() || "";
          return {
            key: key,
            fileName: fileName,
            size: item.Size || 0,
            lastModified: item.LastModified
          };
        });

      console.log(`✅ Se encontraron ${parquetFiles.length} archivos parquet:`);
      parquetFiles.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(2);
        console.log(`  - ${file.fileName} (${sizeKB} KB) - Modificado: ${file.lastModified?.toISOString()}`);
      });

      return parquetFiles;
    } catch (error) {
      console.error("❌ Error listando archivos parquet de S3:", error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Normaliza el nombre del barrio para usarlo como nombre de carpeta
   * Ejemplo: "Palermo Soho" → "PALERMO_SOHO"
   */
  private normalizeBarrioName(barrio: string): string {
    return barrio
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");
  }

  /**
   * Prepara los datos de entrada para incluirlos en la respuesta
   * Normaliza y estructura los parámetros del request
   */
  private prepareInputData(body: any): any {
    return {
      barrio: body.barrio || body.neighborhood || null,
      ambientes: body.ambientes || body.rooms || null,
      metrosCuadradosMin: body.metrosCuadradosMin || body.surface_min || null,
      metrosCuadradosMax: body.metrosCuadradosMax || body.surface_max || null,
      dormitorios: body.dormitorios || body.bedrooms || null,
      banos: body.banos || body.bathrooms || null,
      garajes: body.garajes || body.garages || null,
      antiguedad: body.antiguedad || body.antiquity || body.age || null,
      calle: body.calle || body.street || null
    };
  }

  // ==================== LOCATION SERVICE METHODS ====================

  /**
   * Geocodifica una dirección usando Amazon Location Service
   * Retorna solo las coordenadas (lat/lng)
   * 
   * @param calle - Nombre de la calle (opcional)
   * @param barrio - Nombre del barrio
   * @returns Coordenadas {lat, lng} o null si falla
   */
  async getCoordinates(calle: string | null, barrio: string | null): Promise<{ lat: number; lng: number } | null> {
    try {
      // Validar que tengamos al menos barrio
      if (!barrio) {
        console.warn("⚠️  No se proporcionó barrio para geocodificación");
        return null;
      }

      if (!this.placeIndexName) {
        console.warn("⚠️  AWS_LOCATION_PLACE_INDEX no configurado");
        return null;
      }

      console.log(`📍 Geocodificando dirección: ${calle ? calle + ', ' : ''}${barrio}`);

      const coordinates = await this.geocodeAddress(calle, barrio);

      if (!coordinates) {
        console.log("📭 No se pudo geocodificar la dirección");
        return null;
      }

      console.log(`✅ Coordenadas obtenidas: ${coordinates.lat}, ${coordinates.lng}`);

      return coordinates;

    } catch (error) {
      console.error("❌ Error en geocodificación:", error);
      return null;
    }
  }

  /**
   * Geocodifica una dirección usando Amazon Location Service
   * 
   * @param calle - Nombre de la calle
   * @param barrio - Nombre del barrio
   * @returns Coordenadas o null si falla
   */
  private async geocodeAddress(
    calle: string | null, 
    barrio: string | null
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      // Construir query de dirección
      const addressParts = [];
      if (calle) addressParts.push(calle);
      if (barrio) addressParts.push(barrio);
      addressParts.push("Buenos Aires, Argentina");

      const address = addressParts.join(", ");

      console.log(`🔍 Geocodificando con AWS Location: ${address}`);

      const command = new SearchPlaceIndexForTextCommand({
        IndexName: this.placeIndexName,
        Text: address,
        MaxResults: 1,
        FilterCountries: ["ARG"] // Filtrar solo Argentina
      });

      const response = await this.locationClient.send(command);

      if (!response.Results || response.Results.length === 0) {
        console.log(`📭 Geocoding falló: No se encontraron resultados`);
        return null;
      }

      const place = response.Results[0].Place;
      if (!place || !place.Geometry || !place.Geometry.Point) {
        return null;
      }

      // AWS Location retorna [lng, lat] - invertir el orden
      const [lng, lat] = place.Geometry.Point;

      return { lat, lng };

    } catch (error) {
      console.error("❌ Error en geocoding de AWS:", error);
      return null;
    }
  }

}

