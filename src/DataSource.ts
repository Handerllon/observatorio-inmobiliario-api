import * as path from 'path'
import * as dotenv from 'dotenv';
import { DataSource } from "typeorm";

dotenv.config({
    path: path.resolve(__dirname, '../.env')
  })

var user
var pass
var host
var port
var database

// Username, password and host configuration
user = process.env.DB_USERNAME
pass = process.env.DB_PASSWORD
host = process.env.DB_HOST
port = parseInt(process.env.DB_PORT)
database = process.env.DB_DATABASE


// DataSource configuration for TypeORM
const AppDataSource = new DataSource({
    type: "postgres",
    host: host,
    port: port,
    username: user,
    password: pass,
    database: database,
    entities: ["src/**/*.entity.ts"],
    migrations: ["src/migration/**/*.ts"],
    subscribers: ["src/subscriber/**/*.ts"],
    synchronize: true
});


// Initialize and expose the DataSource
AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
    })
    .catch((err) => {
        console.error("Error during Data Source initialization", err);
    });

export { AppDataSource };