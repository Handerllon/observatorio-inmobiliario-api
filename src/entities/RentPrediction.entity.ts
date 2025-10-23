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
  @Column({ type: "integer", nullable: true })
  inmueblesDisponibles: number;

  @Column({ type: "integer", nullable: true })
  publicacionesRemovidas: number;

  @Column({ type: "integer", nullable: true })
  publicacionesNuevas: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  precioCotaInferior: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  precioCotaSuperior: number;

  @Column({ type: "varchar", length: 10, default: "ARS" })
  moneda: string;

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
      // Input
      barrio: this.barrio,
      ambientes: this.ambientes,
      metrosCuadradosMin: this.metrosCuadradosMin,
      metrosCuadradosMax: this.metrosCuadradosMax,
      dormitorios: this.dormitorios,
      banos: this.banos,
      garajes: this.garajes,
      antiguedad: this.antiguedad,
      calle: this.calle,
      // Output
      inmueblesDisponibles: this.inmueblesDisponibles,
      publicacionesRemovidas: this.publicacionesRemovidas,
      publicacionesNuevas: this.publicacionesNuevas,
      precioCotaInferior: this.precioCotaInferior,
      precioCotaSuperior: this.precioCotaSuperior,
      moneda: this.moneda,
      // Metadata
      status: this.status,
      executionTimeMs: this.executionTimeMs,
      // User data
      userNotes: this.userNotes,
      isFavorite: this.isFavorite,
      // Timestamps
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

