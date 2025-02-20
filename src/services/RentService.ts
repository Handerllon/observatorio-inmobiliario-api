import * as exec from "child_process";
import { timeStamp } from "console";
import { writeFile, mkdir } from "fs/promises";
import * as path from "path";

export class RentService {

	private output_path = process.cwd()+"/api_logs";
	private script_folder = process.cwd()+"/src/scripts";

  async executePrediction(body): Promise<any> {
    try {
			// Generamos timestamp
			const timestamp = new Date().getTime();
			// Creamos el path full
			const folderPath = path.join(this.output_path, timestamp.toString());
			await mkdir(folderPath, { recursive: true })

			// Creamos const para archivo de input
      		const input_filename = `input_data.json`;
			const output_filename = `output_data.json`;

      		await writeFile(`${folderPath}/${input_filename}`, JSON.stringify(body));

			const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
			await sleep(3000)

			const result = await exec.execSync(
				`python3 ${this.script_folder}/report_generator.py ${folderPath}/${input_filename}`
			);

			await writeFile(`${folderPath}/${output_filename}`, JSON.stringify(result.toString()));

			return result.toString()

    } catch (err) {
      console.log(err);
    }
  }
}
