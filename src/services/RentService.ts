import * as exec from "child_process";
import { timeStamp } from "console";
import { writeFileSync, mkdir } from "fs";
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
			await mkdir(folderPath, { recursive: true }, (err) => {
				if (err) {
						console.error("Error creating folder:", err);
				} else {
						console.log("Folder created at:", folderPath);
				}
			});

			// Creamos const para archivo de input
      const input_filename = `input_data.json`;
			const output_filename = `output_data.json`;

      await writeFileSync(`${folderPath}/${input_filename}`, JSON.stringify(body));

	  	const result = await exec.execSync(
        `python3 ${this.script_folder}/report_generator.py ${folderPath}/${input_filename}`
      );

			await writeFileSync(`${folderPath}/${output_filename}`, JSON.stringify(result.toString()));

			return result.toString()

    } catch (err) {
      console.log(err);
    }
  }
}
