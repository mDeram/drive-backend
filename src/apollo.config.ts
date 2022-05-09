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

export default (async (): Promise<Config> => {
    return {
        schema: await buildSchema({
            resolvers: [FsResolver, UserResolver],
        }),
        plugins: [
            ___prod___
                ? ApolloServerPluginLandingPageDisabled()
                : ApolloServerPluginLandingPageGraphQLPlayground()
        ],
        context: ({ req }): MyContext => ({ req })
    };
})();
