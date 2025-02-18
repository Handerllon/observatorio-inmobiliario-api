import * as express from "express";
import * as cors from "cors";
import * as dotenv from "dotenv";
import bodyParser = require("body-parser");
import path = require("path");
import "reflect-metadata";
import { RentRouter } from "./routes/RentRouter";

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
        console.log(
          `Received ${req.method} request from ${req.ip} to ${req.originalUrl}`
        );
        next(); // Continue processing the request
      }
    );
    this.app.use("/", this.router);
    this.app.use(cors());

    new RentRouter().routes(this.router);
  }

  public listen(): void {
    this.app.listen();
  }
}
export default new App().app;
