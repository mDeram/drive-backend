import { DataSourceOptions } from "typeorm";
import { ___prod___ } from "./constants";
import path from "path";
import User from "./entities/User";
import Subscription from "./entities/Subscription";

export default {
    type: "postgres",
    host: !___prod___ ? undefined : "postgres",
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    logging: !___prod___,
    synchronize: !___prod___,
    entities: [User, Subscription],
    migrations: [path.join(__dirname, "./migrations/*")]
} satisfies DataSourceOptions;
