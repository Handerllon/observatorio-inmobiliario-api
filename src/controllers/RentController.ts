import { Request, Response } from "express";
import { RentService } from "../services/RentService";

export class RentController {
  private static service: RentService = new RentService();

  async index(req: Request, res: Response): Promise<any> {
    try {
        const result = {
          body: "Index Response"
        } 
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send(err);
    }
  }

  async predict(req: Request, res: Response): Promise<any> {
    try {
        const result = await RentController.service.executePrediction(req.body)
        // Replace single quotes with double quotes
        const correctedString = result.replace(/'/g, '"');

        // Parse the corrected string into a JSON object
        const jsonObject = JSON.parse(correctedString);
        res.status(200).send({"result": jsonObject});
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
  }
}
