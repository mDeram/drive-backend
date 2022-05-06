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
import { promises as fs } from "fs";
import archiver from "archiver";

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

    app.get('/files/:name([^/]*)', (req, res) => {
        //if(!req.query.user){
        //const username = req.query.userId;
        const finalPath = getFinalPathIfAllowed(req.params.name);
        if (!finalPath) {
            res.end();
            return;
        }

        res.sendFile(finalPath, { dotfiles: "allow" });
        /*} else {
            res.end();
        } */
    });

    app.get('/download/:name([^/]*)', async (req, res) => {
        const isFolder = req.query.folder;
        let name = req.params.name;

        // Remove .zip on folders
        if (isFolder) name = name.slice(0, -4);

        const finalPath = getFinalPathIfAllowed(name);
        if (!finalPath) {
            res.end();
            return;
        }

        let stats;
        try {
            stats = await fs.stat(finalPath);
        } catch(e) {
            console.error(e)
            res.end();
            return;
        }

        if (!isFolder && stats.isFile()) {
            res.download(finalPath, req.params.name, { dotfiles: "allow" });
            return;
        }

        if (isFolder && stats.isDirectory()) {
            const archive = archiver("zip");
            archive.on("error", (e: any) => {
                console.error(e)
                res.end();
            });
            archive.pipe(res);
            archive.directory(finalPath, name);
            archive.finalize();
            return;
        }

        res.end();
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
