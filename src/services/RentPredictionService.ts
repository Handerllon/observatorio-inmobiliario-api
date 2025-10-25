import { AppDataSource } from "../DataSource";
import { RentPrediction, PredictionStatus } from "../entities/RentPrediction.entity";
import { FindOptionsWhere, Between } from "typeorm";

export interface CreatePredictionDto {
  cognitoSub: string;
  userEmail?: string;
  // Campos pre-generación
  barrio?: string;
  ambientes?: number;
  metrosCuadradosMin?: number;
  metrosCuadradosMax?: number;
  dormitorios?: number;
  banos?: number;
  garajes?: number;
  antiguedad?: number;
  calle?: string;
}

export interface UpdatePredictionDto {
  // Campos post-generación (resultados)
  precioCotaInferior?: number;
  precioCotaSuperior?: number;
  moneda?: string;
  // Datos adicionales (JSON)
  images?: Record<string, string>;
  metrics?: Record<string, any>;
  nearbyPlaces?: Record<string, any>;
  // Metadatos
  status?: PredictionStatus;
  errorMessage?: string;
  executionTimeMs?: number;
  // Datos del usuario
  userNotes?: string;
  isFavorite?: boolean;
}

export interface PredictionFilters {
  cognitoSub?: string;
  status?: PredictionStatus;
  barrio?: string;
  dormitorios?: number;
  isFavorite?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  minPrecio?: number;
  maxPrecio?: number;
}

export class RentPredictionService {
  private predictionRepository = AppDataSource.getRepository(RentPrediction);

  /**
   * Crear una nueva predicción
   */
  async createPrediction(data: CreatePredictionDto): Promise<RentPrediction> {
    try {
      const prediction = this.predictionRepository.create({
        ...data,
        status: PredictionStatus.PENDING,
      });

      return await this.predictionRepository.save(prediction);
    } catch (error) {
      console.error("Error al crear predicción:", error);
      throw new Error("No se pudo crear el registro de predicción");
    }
  }

  /**
   * Actualizar una predicción existente
   */
  async updatePrediction(
    id: string,
    data: UpdatePredictionDto
  ): Promise<RentPrediction | null> {
    try {
      const prediction = await this.predictionRepository.findOne({
        where: { id },
      });

      if (!prediction) {
        return null;
      }

      Object.assign(prediction, data);
      return await this.predictionRepository.save(prediction);
    } catch (error) {
      console.error("Error al actualizar predicción:", error);
      throw new Error("No se pudo actualizar la predicción");
    }
  }

  /**
   * Obtener una predicción por ID
   */
  async getPredictionById(id: string): Promise<RentPrediction | null> {
    try {
      return await this.predictionRepository.findOne({
        where: { id },
      });
    } catch (error) {
      console.error("Error al obtener predicción:", error);
      return null;
    }
  }

  /**
   * Obtener predicciones de un usuario
   */
  async getUserPredictions(
    cognitoSub: string,
    filters?: PredictionFilters
  ): Promise<RentPrediction[]> {
    try {
      const where: FindOptionsWhere<RentPrediction> = { cognitoSub };

      if (filters) {
        if (filters.status) where.status = filters.status;
        if (filters.barrio) where.barrio = filters.barrio;
        if (filters.dormitorios) where.dormitorios = filters.dormitorios;
        if (filters.isFavorite !== undefined) where.isFavorite = filters.isFavorite;
      }

      return await this.predictionRepository.find({
        where,
        order: { createdAt: "DESC" },
      });
    } catch (error) {
      console.error("Error al obtener predicciones del usuario:", error);
      return [];
    }
  }

  /**
   * Obtener predicciones con filtros avanzados
   */
  async getPredictions(filters: PredictionFilters): Promise<RentPrediction[]> {
    try {
      const queryBuilder = this.predictionRepository.createQueryBuilder("prediction");

      if (filters.cognitoSub) {
        queryBuilder.andWhere("prediction.cognitoSub = :cognitoSub", {
          cognitoSub: filters.cognitoSub,
        });
      }

      if (filters.status) {
        queryBuilder.andWhere("prediction.status = :status", {
          status: filters.status,
        });
      }

      if (filters.barrio) {
        queryBuilder.andWhere("prediction.barrio = :barrio", {
          barrio: filters.barrio,
        });
      }

      if (filters.dormitorios) {
        queryBuilder.andWhere("prediction.dormitorios = :dormitorios", {
          dormitorios: filters.dormitorios,
        });
      }

      if (filters.isFavorite !== undefined) {
        queryBuilder.andWhere("prediction.isFavorite = :isFavorite", {
          isFavorite: filters.isFavorite,
        });
      }

      if (filters.dateFrom) {
        queryBuilder.andWhere("prediction.createdAt >= :dateFrom", {
          dateFrom: filters.dateFrom,
        });
      }

      if (filters.dateTo) {
        queryBuilder.andWhere("prediction.createdAt <= :dateTo", {
          dateTo: filters.dateTo,
        });
      }

      if (filters.minPrecio !== undefined) {
        queryBuilder.andWhere("prediction.precioCotaInferior >= :minPrecio", {
          minPrecio: filters.minPrecio,
        });
      }

      if (filters.maxPrecio !== undefined) {
        queryBuilder.andWhere("prediction.precioCotaSuperior <= :maxPrecio", {
          maxPrecio: filters.maxPrecio,
        });
      }

      return await queryBuilder
        .orderBy("prediction.createdAt", "DESC")
        .getMany();
    } catch (error) {
      console.error("Error al obtener predicciones con filtros:", error);
      return [];
    }
  }

  /**
   * Marcar predicción como favorita
   */
  async toggleFavorite(id: string, cognitoSub: string): Promise<RentPrediction | null> {
    try {
      const prediction = await this.predictionRepository.findOne({
        where: { id, cognitoSub },
      });

      if (!prediction) {
        return null;
      }

      prediction.isFavorite = !prediction.isFavorite;
      return await this.predictionRepository.save(prediction);
    } catch (error) {
      console.error("Error al marcar como favorito:", error);
      throw new Error("No se pudo actualizar el estado de favorito");
    }
  }

  /**
   * Agregar notas del usuario a una predicción
   */
  async addNotes(
    id: string,
    cognitoSub: string,
    notes: string
  ): Promise<RentPrediction | null> {
    try {
      const prediction = await this.predictionRepository.findOne({
        where: { id, cognitoSub },
      });

      if (!prediction) {
        return null;
      }

      prediction.userNotes = notes;
      return await this.predictionRepository.save(prediction);
    } catch (error) {
      console.error("Error al agregar notas:", error);
      throw new Error("No se pudo agregar las notas");
    }
  }

  /**
   * Eliminar una predicción (soft delete - marcar como eliminada o hard delete)
   */
  async deletePrediction(id: string, cognitoSub: string): Promise<boolean> {
    try {
      const result = await this.predictionRepository.delete({ id, cognitoSub });
      return result.affected !== undefined && result.affected > 0;
    } catch (error) {
      console.error("Error al eliminar predicción:", error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de predicciones del usuario
   */
  async getUserStatistics(cognitoSub: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    favorites: number;
    averagePrice: number;
  }> {
    try {
      const predictions = await this.getUserPredictions(cognitoSub);

      const successful = predictions.filter(
        (p) => p.status === PredictionStatus.SUCCESS
      ).length;
      const failed = predictions.filter(
        (p) => p.status === PredictionStatus.ERROR
      ).length;
      const favorites = predictions.filter((p) => p.isFavorite).length;

      const pricesSum = predictions
        .filter((p) => p.precioCotaInferior && p.precioCotaSuperior)
        .reduce((sum, p) => {
          const avgPrice = (Number(p.precioCotaInferior) + Number(p.precioCotaSuperior)) / 2;
          return sum + avgPrice;
        }, 0);
      const predictionsWithPrice = predictions.filter(
        (p) => p.precioCotaInferior && p.precioCotaSuperior
      ).length;
      const averagePrice =
        predictionsWithPrice > 0 ? pricesSum / predictionsWithPrice : 0;

      return {
        total: predictions.length,
        successful,
        failed,
        favorites,
        averagePrice: Math.round(averagePrice * 100) / 100,
      };
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        favorites: 0,
        averagePrice: 0,
      };
    }
  }

  /**
   * Obtener predicciones recientes del usuario
   */
  async getRecentPredictions(
    cognitoSub: string,
    limit: number = 10
  ): Promise<RentPrediction[]> {
    try {
      return await this.predictionRepository.find({
        where: { cognitoSub },
        order: { createdAt: "DESC" },
        take: limit,
      });
    } catch (error) {
      console.error("Error al obtener predicciones recientes:", error);
      return [];
    }
  }
}

