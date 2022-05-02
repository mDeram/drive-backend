import { Arg, Mutation, Query } from "type-graphql";
import syncFs, { promises as fs } from "fs";
import path from "path";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { finished } from "stream/promises";
const drivePath = "/home/matutu/Development/cloud/drive";

function getFinalPathIfValid(base: string, addition: string): (string | undefined) {
    const finalPath = path.join(base, addition);
    if (!finalPath.startsWith(base))
        return;
    return finalPath;
}

export default class FsResolver {
    @Query(() => [String])
    async ls(
        @Arg("path", { defaultValue: "" }) searchPath: string
    ): Promise<string[]> {
        const finalPath = getFinalPathIfValid(drivePath, searchPath);
        if (!finalPath) return []; // Should return an error

        return fs.readdir(finalPath);
    }

    @Mutation(() => [Boolean])
    async rm(
        @Arg("paths", type => [String]) paths: string[]
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (deletePath) => {
            const finalPath = getFinalPathIfValid(drivePath, deletePath);
            if (!finalPath) return false;
            try {
                await fs.rm(finalPath);
            } catch(e) {
                return false;
            }
            return true;
        }));
    }

    @Mutation(() => Boolean)
    async upload(
        @Arg("file", type => GraphQLUpload) file: FileUpload
    ): Promise<boolean> {
        const { createReadStream, filename, mimetype, encoding } = await file;
        console.log(filename);

        const outPath = getFinalPathIfValid(drivePath, filename);
        if (!outPath) return false;

        const stream = createReadStream();
        const out = syncFs.createWriteStream(outPath);
        stream.pipe(out);

        try {
            await finished(out);
        } catch(e) {
            console.error(e);
            return false;
        }

        return true;
    }
}
