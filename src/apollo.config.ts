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

export default async (orm: Connection): Promise<Config> => {
    return {
        schema: await buildSchema({
            resolvers: [FsResolver, UserResolver],
        }),
        plugins: [
            ___prod___
                ? ApolloServerPluginLandingPageDisabled()
                : ApolloServerPluginLandingPageGraphQLPlayground()
        ],
        context: ({ req, res }): MyContext => ({ req, res, orm })
    };
};
