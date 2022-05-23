import { ConnectionOptions } from "typeorm";
import { ___prod___ } from "./constants";
import path from "path";
import User from "./entities/User";
import Subscription from "./entities/Subscription";

export default {
    type: "postgres",
    database: "cloud",
    username: ___prod___ ? "cloud" : "postgres",
    password: process.env.DB_PASS,
    logging: !___prod___,
    synchronize: !___prod___,
    entities: [User, Subscription],
    migrations: [path.join(__dirname, "./migrations/*")]
} as ConnectionOptions;
