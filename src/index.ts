import "dotenv/config";
import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import { createConnection } from "typeorm";
import typeormConfig from "./typeorm.config";
import express from "express";
import apolloConfig from "./apollo.config";
import session from "express-session";
import { SESSION_COOKIE, ___prod___ } from "./constants";
import connectRedis from "connect-redis";
import Redis from "ioredis";
import { graphqlUploadExpress } from "graphql-upload";
import cors from "cors";
import fsApi from "./api/fs";
import webhook from "./api/webhook";
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_KEY || "", {
    apiVersion: "2020-08-27"
});

const main = async () => {
    const orm = await createConnection(typeormConfig);
    if (___prod___) await orm.runMigrations();

    const RedisStore = connectRedis(session);
    const redis = new Redis();

    const app = express();
    app.disable("x-powered-by");
    if (___prod___) app.set("trust proxy", 1);

    app.use(session({
        store: new RedisStore({
            client: redis,
            prefix: "cloud:sess:"
        }),
        name: SESSION_COOKIE,
        cookie: {
            maxAge: 1000 * 3600 * 24 * 10, // 10 days
            secure: ___prod___,
            sameSite: "lax",
            httpOnly: true
        },
        secret: process.env.COOKIE_SECRET || "",
        resave: false,
        saveUninitialized: false,
    }));

    const apolloServer = new ApolloServer(await apolloConfig(orm));
    await apolloServer.start();

    const frontUrl = process.env.FRONT_URL || "";
    const corsOptions = {
        origin: ["http://localhost:3000", frontUrl],
        credentials: true
    };

    app.use(cors(corsOptions));

    app.use('/api/webhook', webhook);
    app.use('/api/fs', fsApi);

    app.use(graphqlUploadExpress());

    apolloServer.applyMiddleware({
        app,
        cors: corsOptions
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server started on port: ${port}, with front-url: ${frontUrl}`);
    });
}

main();
