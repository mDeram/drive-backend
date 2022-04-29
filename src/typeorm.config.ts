import { ConnectionOptions } from "typeorm";
import { ___prod___ } from "./constants";
import path from "path";

export default {
    type: "postgres",
    database: "cloud",
    username: "cloud",
    password: process.env.DB_PASS,
    logging: !___prod___,
    synchronize: !___prod___,
    entities: [],
    migrations: [path.join(__dirname, "./migrations/*")]
} as ConnectionOptions;
