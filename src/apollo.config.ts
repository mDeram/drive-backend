import { ___prod___ } from "./constants";
import { buildSchema } from "type-graphql";
import {
    ApolloServerPluginLandingPageDisabled ,
} from '@apollo/server/plugin/disabled';
import { MyContext } from "./types";
import FsResolver from "./resolvers/fs";
import UserResolver from "./resolvers/user";
import TestResolver from "./resolvers/test";
import { ApolloServerOptions, ApolloServerPlugin } from "@apollo/server";

const plugins: ApolloServerPlugin[] = [];
if (___prod___) plugins.push(ApolloServerPluginLandingPageDisabled());

export default async (): Promise<ApolloServerOptions<MyContext>> => {
    const resolvers = ___prod___
        ? [FsResolver, UserResolver] as const
        : [FsResolver, UserResolver, TestResolver] as const;

    const schema = await buildSchema({ resolvers });

    return {
        schema,
        plugins,
        csrfPrevention: true
    };
};
