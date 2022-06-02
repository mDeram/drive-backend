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
import TestResolver from "./resolvers/test";

export default async (orm: Connection, redis: Redis): Promise<Config> => {
    const resolvers: Function[] = [FsResolver, UserResolver];
    if (!___prod___) resolvers.push(TestResolver);

    return {
        schema: await buildSchema({
            resolvers: resolvers as any
        }),
        plugins: [
            ___prod___
                ? ApolloServerPluginLandingPageDisabled()
                : ApolloServerPluginLandingPageGraphQLPlayground()
        ],
        context: ({ req, res }): MyContext => ({ req, res, orm, redis }),
        csrfPrevention: true
        /*formatError: (err) => {
        }*/
    };
};
