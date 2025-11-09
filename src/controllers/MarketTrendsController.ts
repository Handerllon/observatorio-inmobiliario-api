import { Request, Response } from "express";
import { AwsAdapter } from "../utils/AwsAdapter";
import { logger } from "../utils/Logger";

/**
 * Controller para manejar las tendencias de mercado inmobiliario
 */
export class MarketTrendsController {
  private static awsAdapter: AwsAdapter = new AwsAdapter();

  /**
   * GET /market-trends/:barrio
   * Obtiene las tendencias de mercado para un barrio específico
   */
  async getTrendsByBarrio(req: Request, res: Response): Promise<any> {
    try {
      const { barrio } = req.params;

      if (!barrio) {
        logger.warning("⚠️  Petición de tendencias sin barrio especificado");
        return res.status(400).json({
          success: false,
          message: "El parámetro 'barrio' es requerido"
        });
      }

      logger.info(`📈 Obteniendo tendencias de mercado para ${barrio}`);

      // Obtener tendencias desde S3
      const trends = await MarketTrendsController.awsAdapter.getMarketTrends(barrio);

      if (!trends) {
        logger.info(`📭 No se encontraron tendencias para ${barrio}`);
        return res.status(404).json({
          success: false,
          message: `No se encontraron tendencias de mercado para el barrio ${barrio}`,
          barrio: barrio
        });
      }

      logger.info(`✅ Tendencias de mercado obtenidas exitosamente para ${barrio}`);

      res.status(200).json({
        success: true,
        message: "Tendencias de mercado obtenidas exitosamente",
        barrio: barrio,
        data: trends
      });

    } catch (err) {
      logger.error("❌ Error al obtener tendencias de mercado:", err);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al obtener tendencias de mercado"
      });
    }
  }
}

