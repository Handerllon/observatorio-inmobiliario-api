import * as express from "express";
import * as cors from "cors";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";
import { AppDataSource } from "./DataSource";
import bodyParser = require("body-parser");
import path = require("path");
import "reflect-metadata";
import { RentRouter } from "./routes/RentRouter";
import { UserRouter } from "./routes/UserRouter";
import { RentPredictionRouter } from "./routes/RentPredictionRouter";
import { logger } from "./utils/Logger";


class App {
  public app: express.Application;
  public router: express.Router;

  constructor() {
    // set variables
    this.app = express();
    this.router = express.Router();

    // config envirnoment file
    dotenv.config({
      path: path.resolve(__dirname, "../.env"),
    });

    // setting uses
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // initialize resources
    this.initializeRoutes();

  }

  private initializeRoutes() {
    this.app.use(bodyParser.json());
    this.app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        logger.info(
          `📥 ${req.method} ${req.originalUrl} - IP: ${req.ip}`
        );
        next(); // Continue processing the request
      }
    );
    this.app.use("/", this.router);
    this.app.use(cors());

    new RentRouter().routes(this.router);
    new UserRouter().routes(this.router);
    new RentPredictionRouter().routes(this.router);
  }

  private initializeDatabase() {
    // initialize database
    const PostgresDataSource: DataSource = AppDataSource;
    PostgresDataSource.initialize();
  }

  public listen(): void {
    this.app.listen();
  }
}
export default new App().app;
