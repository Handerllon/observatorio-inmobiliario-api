import axios from "axios";
import { logger } from "./Logger";

/**
 * OverpassAdapter
 * 
 * Adapter para buscar lugares cercanos usando Overpass API (OpenStreetMap)
 * Overpass tiene excelente cobertura de datos en Argentina y es gratuito
 * 
 * Categorías soportadas:
 * - transporte: Estaciones, subte, paradas de bus
 * - sitios_interes: Parques, plazas, atracciones turísticas
 * - edificios_administrativos: Bancos, edificios públicos, correos
 * - instituciones_educativas: Escuelas, universidades, jardines
 * - centros_salud: Hospitales, clínicas, farmacias
 * - restaurantes: Restaurantes, cafés, bares
 */
export class OverpassAdapter {
  private overpassUrl = "https://overpass-api.de/api/interpreter";
  private searchRadius = 500; // 500 metros

  /**
   * Busca lugares cercanos usando coordenadas
   * 
   * @param lat - Latitud
   * @param lng - Longitud
   * @returns Objeto con lugares organizados por categoría
   */
  async getNearbyPlaces(lat: number, lng: number): Promise<any> {
    try {
      logger.info(`📍 Buscando lugares cercanos con Overpass: ${lat}, ${lng} (radio: ${this.searchRadius}m)`);

      // Buscar todas las categorías en paralelo (sin límite)
      const [
        transporte,
        sitios_interes,
        edificios_administrativos,
        instituciones_educativas,
        centros_salud,
        restaurantes
      ] = await Promise.all([
        this.searchByCategory(lat, lng, "transporte"),
        this.searchByCategory(lat, lng, "sitios_interes"),
        this.searchByCategory(lat, lng, "edificios_administrativos"),
        this.searchByCategory(lat, lng, "instituciones_educativas"),
        this.searchByCategory(lat, lng, "centros_salud"),
        this.searchByCategory(lat, lng, "restaurantes")
      ]);

      const nearbyPlaces = {
        coordinates: { lat, lng },
        transporte: transporte,
        sitios_interes: sitios_interes,
        edificios_administrativos: edificios_administrativos,
        instituciones_educativas: instituciones_educativas,
        centros_salud: centros_salud,
        restaurantes: restaurantes,
        summary: {
          total: transporte.length + sitios_interes.length + edificios_administrativos.length + 
                 instituciones_educativas.length + centros_salud.length + restaurantes.length,
          transporte: transporte.length,
          sitios_interes: sitios_interes.length,
          edificios_administrativos: edificios_administrativos.length,
          instituciones_educativas: instituciones_educativas.length,
          centros_salud: centros_salud.length,
          restaurantes: restaurantes.length
        }
      };

      logger.info(`✅ Se encontraron ${nearbyPlaces.summary.total} lugares cercanos con Overpass`);

      return nearbyPlaces;

    } catch (error) {
      logger.error("❌ Error obteniendo lugares de Overpass:", error);
      return this.getEmptyNearbyPlacesResponse(lat, lng);
    }
  }

  /**
   * Busca lugares por categoría usando Overpass QL
   * 
   * @param lat - Latitud
   * @param lng - Longitud  
   * @param category - Categoría a buscar
   * @returns Array de lugares (todos los encontrados en el radio)
   */
  private async searchByCategory(
    lat: number,
    lng: number,
    category: string
  ): Promise<any[]> {
    try {
      const query = this.buildOverpassQuery(lat, lng, category);
      
      const response = await axios.post(
        this.overpassUrl,
        query,
        {
          headers: { "Content-Type": "text/plain" },
          timeout: 10000
        }
      );

      if (!response.data || !response.data.elements) {
        return [];
      }

      // Mapear resultados al formato deseado
      const places = response.data.elements
        .filter((element: any) => element.tags && element.tags.name)
        .map((element: any) => {
          const elementLat = element.lat || element.center?.lat;
          const elementLng = element.lon || element.center?.lon;

          return {
            name: element.tags.name || "Sin nombre",
            address: this.buildAddress(element.tags),
            rating: null, // Overpass no provee ratings
            distance: this.calculateDistance(lat, lng, elementLat, elementLng),
            types: this.getTypes(element.tags, category),
            location: {
              lat: elementLat,
              lng: elementLng
            },
            osm_id: element.id,
            osm_type: element.type
          };
        })
        .sort((a: any, b: any) => a.distance - b.distance);

      logger.debug(`  ✓ ${category}: ${places.length} encontrados`);

      return places;

    } catch (error) {
      logger.error(`❌ Error buscando ${category}:`, error);
      return [];
    }
  }

  /**
   * Construye la query de Overpass QL según la categoría
   * 
   * @param lat - Latitud
   * @param lng - Longitud
   * @param category - Categoría
   * @returns Query en formato Overpass QL
   */
  private buildOverpassQuery(lat: number, lng: number, category: string): string {
    const radius = this.searchRadius;

    const queries: { [key: string]: string } = {
      transporte: `
        [out:json][timeout:10];
        (
          node["public_transport"="station"](around:${radius},${lat},${lng});
          node["public_transport"="stop_position"](around:${radius},${lat},${lng});
          node["railway"="station"](around:${radius},${lat},${lng});
          node["railway"="subway_entrance"](around:${radius},${lat},${lng});
          node["highway"="bus_stop"](around:${radius},${lat},${lng});
          way["public_transport"="station"](around:${radius},${lat},${lng});
        );
        out center;
      `,
      sitios_interes: `
        [out:json][timeout:10];
        (
          node["leisure"="park"](around:${radius},${lat},${lng});
          node["leisure"="garden"](around:${radius},${lat},${lng});
          node["leisure"="playground"](around:${radius},${lat},${lng});
          node["tourism"="attraction"](around:${radius},${lat},${lng});
          node["tourism"="museum"](around:${radius},${lat},${lng});
          node["tourism"="viewpoint"](around:${radius},${lat},${lng});
          way["leisure"="park"](around:${radius},${lat},${lng});
          way["leisure"="garden"](around:${radius},${lat},${lng});
          way["tourism"="attraction"](around:${radius},${lat},${lng});
        );
        out center;
      `,
      edificios_administrativos: `
        [out:json][timeout:10];
        (
          node["amenity"="bank"](around:${radius},${lat},${lng});
          node["amenity"="atm"](around:${radius},${lat},${lng});
          node["office"="government"](around:${radius},${lat},${lng});
          node["amenity"="townhall"](around:${radius},${lat},${lng});
          node["amenity"="post_office"](around:${radius},${lat},${lng});
          node["amenity"="police"](around:${radius},${lat},${lng});
          way["amenity"="bank"](around:${radius},${lat},${lng});
          way["office"="government"](around:${radius},${lat},${lng});
          way["amenity"="townhall"](around:${radius},${lat},${lng});
        );
        out center;
      `,
      instituciones_educativas: `
        [out:json][timeout:10];
        (
          node["amenity"="school"](around:${radius},${lat},${lng});
          node["amenity"="university"](around:${radius},${lat},${lng});
          node["amenity"="college"](around:${radius},${lat},${lng});
          node["amenity"="kindergarten"](around:${radius},${lat},${lng});
          way["amenity"="school"](around:${radius},${lat},${lng});
          way["amenity"="university"](around:${radius},${lat},${lng});
          way["amenity"="college"](around:${radius},${lat},${lng});
        );
        out center;
      `,
      centros_salud: `
        [out:json][timeout:10];
        (
          node["amenity"="hospital"](around:${radius},${lat},${lng});
          node["amenity"="clinic"](around:${radius},${lat},${lng});
          node["amenity"="pharmacy"](around:${radius},${lat},${lng});
          node["amenity"="doctors"](around:${radius},${lat},${lng});
          node["healthcare"="hospital"](around:${radius},${lat},${lng});
          node["healthcare"="clinic"](around:${radius},${lat},${lng});
          way["amenity"="hospital"](around:${radius},${lat},${lng});
          way["amenity"="clinic"](around:${radius},${lat},${lng});
        );
        out center;
      `,
      restaurantes: `
        [out:json][timeout:10];
        (
          node["amenity"="restaurant"](around:${radius},${lat},${lng});
          node["amenity"="cafe"](around:${radius},${lat},${lng});
          node["amenity"="fast_food"](around:${radius},${lat},${lng});
          node["amenity"="bar"](around:${radius},${lat},${lng});
          way["amenity"="restaurant"](around:${radius},${lat},${lng});
          way["amenity"="cafe"](around:${radius},${lat},${lng});
        );
        out center;
      `
    };

    return queries[category] || queries.restaurantes;
  }

  /**
   * Construye la dirección desde los tags de OSM
   * 
   * @param tags - Tags del elemento OSM
   * @returns Dirección formateada
   */
  private buildAddress(tags: any): string {
    const parts = [];

    if (tags["addr:street"]) parts.push(tags["addr:street"]);
    if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
    if (tags["addr:suburb"]) parts.push(tags["addr:suburb"]);
    if (tags["addr:city"]) parts.push(tags["addr:city"]);

    return parts.length > 0 ? parts.join(", ") : "Dirección no disponible";
  }

  /**
   * Obtiene los tipos/categorías del lugar
   * 
   * @param tags - Tags del elemento OSM
   * @param category - Categoría principal
   * @returns Array de tipos
   */
  private getTypes(tags: any, category: string): string[] {
    const types = [category];

    if (tags.amenity) types.push(tags.amenity);
    if (tags.shop) types.push(tags.shop);
    if (tags.leisure) types.push(tags.leisure);
    if (tags.cuisine) types.push(tags.cuisine);

    return Array.from(new Set(types)); // Remove duplicates
  }

  /**
   * Calcula la distancia entre dos coordenadas en metros (fórmula Haversine)
   * 
   * @param lat1 - Latitud punto 1
   * @param lon1 - Longitud punto 1
   * @param lat2 - Latitud punto 2
   * @param lon2 - Longitud punto 2
   * @returns Distancia en metros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Retorna respuesta vacía cuando no se pueden obtener lugares
   * 
   * @param lat - Latitud
   * @param lng - Longitud
   * @returns Estructura vacía con coordenadas
   */
  private getEmptyNearbyPlacesResponse(lat: number, lng: number): any {
    return {
      coordinates: { lat, lng },
      transporte: [],
      sitios_interes: [],
      edificios_administrativos: [],
      instituciones_educativas: [],
      centros_salud: [],
      restaurantes: [],
      summary: {
        total: 0,
        transporte: 0,
        sitios_interes: 0,
        edificios_administrativos: 0,
        instituciones_educativas: 0,
        centros_salud: 0,
        restaurantes: 0
      }
    };
  }
}

