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
import getFinalPathIfAllowed from "./utils/getFinalPathIfAllowed";

const main = async () => {
    //const orm = await createConnection(typeormConfig);
    //if (___prod___) await orm.runMigrations();

    const RedisStore = connectRedis(session);
    const redis = new Redis();

    const app = express();
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

    const apolloServer = new ApolloServer(await apolloConfig);
    await apolloServer.start();

    const frontUrl = process.env.FRONT_URL || "";
    const corsOptions = {
        origin: ["http://localhost:3000", frontUrl],
        credentials: true
    };

    app.use(cors(corsOptions));

    app.get('/files/:name([^/]*)', function(req, res){
        //if(!req.query.user){
        //const username = req.query.userId;
        const finalPath = getFinalPathIfAllowed(req.params.name);
        if (!finalPath) {
            res.send("not allowed");
            return;
        }

        res.sendFile(finalPath, { dotfiles: "allow" });
        /*} else {
            res.send("not allowed");
        } */
    });

    app.get('/download/:name([^/]*)', function(req, res){
        const finalPath = getFinalPathIfAllowed(req.params.name);
        if (!finalPath) {
            res.send("not allowed");
            return;
        }

        res.download(req.params.name, req.params.name, { root: '../drive/', dotfiles: "allow" });
        /*} else {
            res.send("not allowed");
        } */
    });

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
