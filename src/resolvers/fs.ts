import { Arg, Mutation, Query } from "type-graphql";
import syncFs, { promises as fs } from "fs";
import pathLib from "path";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { finished } from "stream/promises";
import DirectoryItem from "../entities/DirectoryItem";
import getFinalPathIfAllowed from "../utils/getFinalPathIfAllowed";

export default class FsResolver {
    @Query(() => [DirectoryItem])
    async ls(
        @Arg("path", { defaultValue: "" }) searchPath: string
    ): Promise<DirectoryItem[]> {
        const finalPath = getFinalPathIfAllowed(searchPath);
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
            const finalPath = getFinalPathIfAllowed(deletePath);
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
        @Arg("additionalPath", { defaultValue: "" }) additionalPath: string,
        @Arg("file", type => GraphQLUpload) file: FileUpload
    ): Promise<boolean> {
        const { createReadStream, filename, mimetype, encoding } = await file;

        const outPath = getFinalPathIfAllowed(pathLib.join(uploadPath, additionalPath, filename));
        const dirPath = getFinalPathIfAllowed(pathLib.join(uploadPath, additionalPath));
        if (!outPath || !dirPath) return false;

        await fs.mkdir(dirPath, { recursive: true });

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
        const finalPath = getFinalPathIfAllowed(dirname);
        if (!finalPath) return false;

        try {
            await fs.mkdir(finalPath);
        } catch(e) {
            return false;
        }
        return true;
    }

}
