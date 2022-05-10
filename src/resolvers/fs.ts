import { Arg, Int, Mutation, Query } from "type-graphql";
import syncFs, { promises as fs } from "fs";
import pathLib from "path";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { finished } from "stream/promises";
import DirectoryItem from "../entities/DirectoryItem";
import { getFilesPathIfAllowed, getFinalFilesPathIfAllowed, getFinalPathIfAllowed, getPathIfAllowed, getTrashPathIfAllowed, toTrashPathIfAllowed } from "../utils/pathAccess";
import { exec } from "child_process";
import { promisify } from "util";
import { find, grep } from "../utils/search";
import { v4 as uuid } from "uuid";
const execAsync = promisify(exec);

export default class FsResolver {
    @Query(() => [DirectoryItem])
    async ls(
        @Arg("path", { defaultValue: "/files" }) searchPath: string
    ): Promise<DirectoryItem[]> {
        const finalPath = getFinalPathIfAllowed(searchPath);
        if (!finalPath) return []; // Should return an error

        const content = await fs.readdir(finalPath, { withFileTypes: true })
        return content.map(item => ({
            type: item.isDirectory() ? "folder" : "file",
            name: item.name
        }));
    }

    @Query(() => [DirectoryItem])
    async lsTrash(
        @Arg("path", { defaultValue: "/trash" }) searchPath: string
    ): Promise<DirectoryItem[]> {
        const finalPath = getFinalPathIfAllowed(searchPath);
        if (!finalPath) return [];

        const content = await fs.readdir(finalPath, { withFileTypes: true })
        return content.map(item => ({
            type: item.isDirectory() ? "folder" : "file",
            name: item.name.match(/(.*)\.(.*)\.(.*)/)![1] //1 filename, 2 timestamp, 3 uuid
        }));
    }

    @Mutation(() => [Boolean])
    async rm(
        @Arg("paths", type => [String]) paths: string[]
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toDeletePath) => {
            const finalPath = getFinalPathIfAllowed(toDeletePath);
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

    @Mutation(() => [Boolean])
    async trash(
        @Arg("paths", type => [String]) paths: string[]
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toTrashPath) => {
            const oldPath = getFinalFilesPathIfAllowed(toTrashPath);
            const finalPath = toTrashPathIfAllowed(toTrashPath);
            console.log(toTrashPath, oldPath, finalPath);
            if (!oldPath || !finalPath) return false;

            try {
                await fs.rename(oldPath, finalPath + "." + Date.now() + "." + uuid());
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

    @Query(() => Int)
    async diskUsage(): Promise<number | undefined> {
        const finalPath = getFinalPathIfAllowed();
        if (!finalPath) return;

        try {
            //TODO security check can finalPath inject commands
            const { stdout, stderr } = await execAsync(`du -s "${finalPath}" | cut -f1`);
            if (stderr) {
                console.error(stderr);
                return;
            }
            return parseInt(stdout);
        } catch(e) {
            console.error(e);
            return;
        }
    }

    @Query(() => [DirectoryItem])
    async search(
        @Arg("pattern") pattern: string
    ): Promise<DirectoryItem[]> {
        const finalPath = getFinalPathIfAllowed();
        if (!finalPath) return [];

        let results: string | null = null;

        try { results = await find(finalPath, pattern) } catch(e) {}

        if (!results) {
            try { results = await grep(finalPath, pattern) } catch(e) {}
        }

        if (!results) return [];

        const resultArray = results.split("\n");

        // Remove last element '' (empty string)
        resultArray.pop();

        return (await Promise.all(
            resultArray.map(async (filename) => {
                const stat = await fs.stat(filename);
                return {
                    type: stat.isDirectory() ? "folder" : "file",
                    name: pathLib.basename(filename),
                    path: getPathIfAllowed(pathLib.dirname(filename))
                } as DirectoryItem;
            }))
        ).filter(directoryItem => directoryItem.path !== undefined);
    }

}
