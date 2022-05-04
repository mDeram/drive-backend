import { Arg, Mutation, Query } from "type-graphql";
import syncFs, { promises as fs } from "fs";
import pathLib from "path";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { finished } from "stream/promises";
import DirectoryItem from "../entities/DirectoryItem";
const drivePath = "/home/matutu/Development/cloud/drive";

function getFinalPathIfValid(base: string, addition: string): (string | undefined) {
    //fs.realpath ??
    const finalPath = pathLib.join(base, addition);
    if (!finalPath.startsWith(base))
        return;
    return finalPath;
}

export default class FsResolver {
    @Query(() => [DirectoryItem])
    async ls(
        @Arg("path", { defaultValue: "" }) searchPath: string
    ): Promise<DirectoryItem[]> {
        const finalPath = getFinalPathIfValid(drivePath, searchPath);
        if (!finalPath) return []; // Should return an error

        const content = await fs.readdir(finalPath, { withFileTypes: true })
        return content.map(item => ({
            type: item.isDirectory() ? "folder" : "file",
            name: item.name
        }));
    }

    @Mutation(() => [Boolean])
    async rm(
        @Arg("paths", type => [String]) paths: string[]
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (deletePath) => {
            const finalPath = getFinalPathIfValid(drivePath, deletePath);
            if (!finalPath) return false;
            try {
                await fs.rm(finalPath, { recursive: true });
            } catch(e) {
                console.error(e);
                return false;
            }
            return true;
        }));
    }

    @Mutation(() => Boolean)
    async upload(
        @Arg("path", { defaultValue: "" }) uploadPath: string,
        @Arg("file", type => GraphQLUpload) file: FileUpload
    ): Promise<boolean> {
        const { createReadStream, filename, mimetype, encoding } = await file;

        const outPath = getFinalPathIfValid(drivePath, pathLib.join(uploadPath, filename));
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

    @Mutation(() => Boolean)
    async mkdir(
        @Arg("dirname") dirname: string
    ): Promise<boolean> {
        const finalPath = getFinalPathIfValid(drivePath, dirname);
        if (!finalPath) return false;

        try {
            await fs.mkdir(finalPath);
        } catch(e) {
            return false;
        }
        return true;
    }

}
