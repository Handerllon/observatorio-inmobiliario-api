import { Router } from "express";
import { MarketTrendsController } from "../controllers/MarketTrendsController";

/**
 * Router para endpoints de tendencias de mercado inmobiliario
 */
export class MarketTrendsRouter {
  private controller: MarketTrendsController;
  private prefix: string = "/market-trends";

  constructor() {
    this.controller = new MarketTrendsController();
  }

  public routes(router: Router): void {
    // GET /market-trends/:barrio - Obtener tendencias de mercado por barrio
    // Endpoint público (no requiere autenticación)
    router.get(
      `${this.prefix}/:barrio`,
      this.controller.getTrendsByBarrio.bind(this.controller)
    );
  }
}

