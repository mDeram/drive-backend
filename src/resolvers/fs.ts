import { Arg, Mutation, Query } from "type-graphql";

export default class FsResolver {
    @Query(() => [String])
    async ls(
        @Arg("path", { defaultValue: "" }) path: string
    ): Promise<string[]> {
        //check path validity (sandbox?)
        //find files
        //return them

        return [];
    }

    @Mutation(() => [Boolean])
    async rm(
        @Arg("paths", type => [String]) paths: string[]
    ): Promise<boolean[]> {
        //check paths validity (sandbox?)
        //find and remove files
        //return deletion status

        return [];
    }
}
