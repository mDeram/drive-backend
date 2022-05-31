import { Config } from "apollo-server-express";
import { ___prod___ } from "./constants";
import { buildSchema } from "type-graphql";
import {
    ApolloServerPluginLandingPageDisabled,
    ApolloServerPluginLandingPageGraphQLPlayground
} from "apollo-server-core";

import { MyContext } from "./types";
import FsResolver from "./resolvers/fs";
import UserResolver from "./resolvers/user";
import { Connection } from "typeorm";
import { Redis } from "ioredis";

export default async (orm: Connection, redis: Redis): Promise<Config> => {
    return {
        schema: await buildSchema({
            resolvers: [FsResolver, UserResolver],
        }),
        plugins: [
            ___prod___
                ? ApolloServerPluginLandingPageDisabled()
                : ApolloServerPluginLandingPageGraphQLPlayground()
        ],
        context: ({ req, res }): MyContext => ({ req, res, orm, redis }),
        /*formatError: (err) => {
        }*/
    };
};
