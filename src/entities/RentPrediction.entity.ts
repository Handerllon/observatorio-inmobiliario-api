import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index 
} from "typeorm";

export enum PredictionStatus {
  SUCCESS = "success",
  ERROR = "error",
  PENDING = "pending"
}

@Entity("rent_predictions")
@Index(["cognitoSub", "createdAt"])
export class RentPrediction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // ==================== TRACKING DE USUARIO ====================
  @Column({ type: "varchar", length: 255, nullable: false })
  @Index()
  cognitoSub: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  userEmail: string;

  // ==================== CAMPOS PRE-GENERACIÓN (Input) ====================
  @Column({ type: "varchar", length: 255, nullable: true })
  barrio: string;

  @Column({ type: "integer", nullable: true })
  ambientes: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  metrosCuadradosMin: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  metrosCuadradosMax: number;

  @Column({ type: "integer", nullable: true })
  dormitorios: number;

  @Column({ type: "integer", nullable: true })
  banos: number;

  @Column({ type: "integer", nullable: true })
  garajes: number;

  @Column({ type: "integer", nullable: true })
  antiguedad: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  calle: string;

  // ==================== CAMPOS POST-GENERACIÓN (Resultados) ====================
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  precioCotaInferior: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  precioCotaSuperior: number;

  @Column({ type: "varchar", length: 10, default: "ARS" })
  moneda: string;

  // ==================== DATOS ADICIONALES (JSON) ====================
  
  /**
   * URLs de imágenes del reporte
   * Estructura: {
   *   price_by_m2_evolution: string,
   *   price_evolution: string,
   *   bar_price_by_amb: string,
   *   bar_m2_price_by_amb: string,
   *   bar_price_by_amb_neighborhood: string,
   *   bar_m2_price_by_amb_neighborhood: string,
   *   pie_property_amb_distribution: string,
   *   pie_property_m2_distribution_neighborhood: string,
   *   pie_property_amb_distribution_neighborhood: string
   * }
   */
  @Column({ type: "jsonb", nullable: true })
  images: Record<string, string>;

  /**
   * Métricas del barrio
   * Estructura: {
   *   total_properties: number,
   *   new_properties_since_last_report: number,
   *   removed_properties_since_last_report: number,
   *   total_properties_neighborhood: number,
   *   average_price_neighborhood: string,
   *   min_price_neighborhood: string,
   *   max_price_neighborhood: string,
   *   new_properties_since_last_report_neighborhood: number,
   *   removed_properties_since_last_report_neighborhood: number
   * }
   */
  @Column({ type: "jsonb", nullable: true })
  metrics: Record<string, any>;

  /**
   * Lugares cercanos encontrados via Overpass API
   * Estructura: {
   *   coordinates: { lat: number, lng: number },
   *   transporte: Array,
   *   sitios_interes: Array,
   *   edificios_administrativos: Array,
   *   instituciones_educativas: Array,
   *   centros_salud: Array,
   *   restaurantes: Array,
   *   summary: { total: number, ... }
   * }
   */
  @Column({ type: "jsonb", nullable: true })
  nearbyPlaces: Record<string, any>;

  // ==================== METADATOS DE LA PREDICCIÓN ====================
  @Column({
    type: "enum",
    enum: PredictionStatus,
    default: PredictionStatus.PENDING
  })
  @Index()
  status: PredictionStatus;

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  @Column({ type: "integer", nullable: true })
  executionTimeMs: number;

  // ==================== DATOS DEL USUARIO ====================
  @Column({ type: "text", nullable: true })
  userNotes: string;

  @Column({ type: "boolean", default: false })
  @Index()
  isFavorite: boolean;

  // ==================== TIMESTAMPS ====================
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==================== MÉTODOS ====================
  toJSON() {
    return {
      id: this.id,
      cognitoSub: this.cognitoSub,
      userEmail: this.userEmail,
      // Input data
      input_data: {
        barrio: this.barrio,
        ambientes: this.ambientes,
        metrosCuadradosMin: this.metrosCuadradosMin,
        metrosCuadradosMax: this.metrosCuadradosMax,
        dormitorios: this.dormitorios,
        banos: this.banos,
        garajes: this.garajes,
        antiguedad: this.antiguedad,
        calle: this.calle,
      },
      // Predictions
      predictionMin: this.precioCotaInferior,
      predictionMax: this.precioCotaSuperior,
      moneda: this.moneda,
      // Additional data
      images: this.images,
      metrics: this.metrics,
      nearby_places: this.nearbyPlaces,
      // Metadata
      status: this.status,
      executionTimeMs: this.executionTimeMs,
      errorMessage: this.errorMessage,
      // User data
      userNotes: this.userNotes,
      isFavorite: this.isFavorite,
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

