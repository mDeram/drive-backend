import "dotenv/config";
import "reflect-metadata";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from '@apollo/server/express4';
import { DataSource } from "typeorm";
import typeormConfig from "./typeorm.config";
import express from "express";
import apolloConfig from "./apollo.config";
import session from "express-session";
import { SESSION_COOKIE, ___prod___ } from "./constants";
import RedisStore from "connect-redis";
import Redis from "ioredis";
//import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress";
import cors from "cors";
import fsApi from "./api/fs";
import webhook from "./api/webhook";
import { getSessionPrefix } from "./redis/keys";
import { MyContext } from "./types";
import { Request, Response } from "express";

export const redis = new Redis();

const main = async () => {
    const orm = new DataSource(typeormConfig);
    await orm.initialize();
    if (___prod___) await orm.runMigrations();

    const app = express();
    app.disable("x-powered-by");
    if (___prod___) app.set("trust proxy", 1);

    app.use(session({
        store: new RedisStore({
            client: redis,
            prefix: getSessionPrefix()
        }),
        name: SESSION_COOKIE,
        cookie: {
            maxAge: 1000 * 3600 * 24 * 10, // 10 days
            secure: ___prod___,
            sameSite: "lax",
            httpOnly: true,
            domain: ___prod___ ? "drive.mderam.com" : undefined
        },
        secret: process.env.COOKIE_SECRET || "",
        resave: false,
        saveUninitialized: false,
    }));

    const apolloServer = new ApolloServer(await apolloConfig());
    await apolloServer.start();

    const frontUrl = process.env.FRONT_URL || "";
    const corsOptions = {
        origin: ["http://localhost:3000", frontUrl],
        credentials: true
    };

    app.use(cors(corsOptions));

    app.use('/webhook', webhook);
    app.use('/fs', fsApi);

    //app.use(graphqlUploadExpress());

    app.use(
        '/graphql',
        express.json(),
        expressMiddleware(apolloServer, {
            context: async ({ req, res }: { req: Request, res: Response }): Promise<MyContext> => ({ req, res, orm, redis }),
        }),
    );

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server started on port: ${port}, with front-url: ${frontUrl}`);
    });
}

main();
