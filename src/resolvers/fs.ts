import { Arg, Int, Mutation, Query } from "type-graphql";
import syncFs, { promises as fs } from "fs";
import pathLib from "path";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { finished } from "stream/promises";
import DirectoryItem from "../entities/DirectoryItem";
import { exec } from "child_process";
import { promisify } from "util";
import { find, grep } from "../utils/search";
import SafePath from "../utils/SafePath";
import { FILES_DIR, tmpClientId, TRASH_DIR } from "../constants";
import { fromTrashName } from "../utils/trash";
import TrashDirectoryItem from "../entities/TrashDirectoryItem";
import SearchDirectoryItem from "../entities/SearchDirectoryItem";
const execAsync = promisify(exec);

export default class FsResolver {
    @Query(() => [DirectoryItem])
    async ls(
        @Arg("path", { defaultValue: "/files" }) searchPath: string
    ): Promise<DirectoryItem[]> {
        const sp = new SafePath(tmpClientId, searchPath);

        const content = await fs.readdir(sp.getServerPath(), { withFileTypes: true })
        return content.map(item => ({
            type: item.isDirectory() ? "folder" : "file",
            name: item.name
        }));
    }

    @Query(() => [TrashDirectoryItem])
    async lsTrash(): Promise<TrashDirectoryItem[]> {
        const sp = new SafePath(tmpClientId, TRASH_DIR);

        const content = await fs.readdir(sp.getServerPath(), { withFileTypes: true })
        console.log(content);

        return content.map(item => {
            const data = fromTrashName(item.name);
            if (!data) return;
            console.log(data);

            return {
                type: item.isDirectory() ? "folder" : "file",
                ...data
            };
        }).filter(item => item) as TrashDirectoryItem[];
    }

    @Mutation(() => [Boolean])
    async rm(
        @Arg("paths", type => [String]) paths: string[]
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toDeletePath) => {
            const sp = new SafePath(tmpClientId, toDeletePath);

            try {
                await fs.rm(sp.getServerPath(), { recursive: true });
            } catch(e) {
                console.error("rm", e);
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
            const sp = new SafePath(tmpClientId, toTrashPath);
            if (!sp.isFilesItem()) return false;

            const oldPath = sp.getServerPath();
            sp.filesItemToTrashItemOrThrow();

            try {
                await fs.rename(oldPath, sp.getServerPath());
            } catch(e) {
                console.error("trash", e);
                return false;
            }
            return true;
        }));
    }

    @Mutation(() => [Boolean])
    async restore(
        @Arg("paths", type => [String]) paths: string[],
        //@Arg("times", type => [Int]) times: number[],
        //@Arg("ids", type => [String]) ids: string[]
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toTrashPath) => {
            const sp = new SafePath(tmpClientId, toTrashPath);
            if (!sp.isTrashItem()) return false;

            const oldPath = sp.getServerPath();
            sp.trashItemToFilesItemOrThrow();

            try {
                await fs.rename(oldPath, sp.getServerPath());
            } catch(e) {
                console.error("restore", e);
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

        const safeOutPath = new SafePath(tmpClientId, pathLib.join(uploadPath, additionalPath, filename));
        const safeDirPath = new SafePath(tmpClientId, pathLib.join(uploadPath, additionalPath));

        await fs.mkdir(safeDirPath.getServerPath(), { recursive: true });

        const stream = createReadStream();
        const out = syncFs.createWriteStream(safeOutPath.getServerPath());
        stream.pipe(out);

        try {
            await finished(out);
        } catch(e) {
            console.error("upload", e);
            return false;
        }

        return true;
    }

    @Mutation(() => Boolean)
    async mkdir(
        @Arg("dirname") dirname: string
    ): Promise<boolean> {
        const sp = new SafePath(tmpClientId, dirname);

        try {
            await fs.mkdir(sp.getServerPath());
        } catch(e) {
            console.error("mkdir", e);
            return false;
        }
        return true;
    }

    @Query(() => Int)
    async diskUsage(): Promise<number | undefined> {
        const sp = new SafePath(tmpClientId, "/");

        try {
            //TODO security check can finalPath inject commands
            const { stdout, stderr } = await execAsync(`du -s "${sp.getServerPath()}" | cut -f1`);
            if (stderr) {
                console.error("du", stderr);
                return;
            }
            return parseInt(stdout);
        } catch(e) {
            console.error("diskUsage", e);
            return;
        }
    }

    @Query(() => [SearchDirectoryItem])
    async search(
        @Arg("pattern") pattern: string
    ): Promise<SearchDirectoryItem[]> {
        const sp = new SafePath(tmpClientId, FILES_DIR);

        let results: string | null = null;

        try { results = await find(sp.getServerPath(), pattern) } catch(e) {}

        if (!results) {
            try { results = await grep(sp.getServerPath(), pattern) } catch(e) {}
        }

        if (!results) return [];

        const resultArray = results.split("\n");

        // Remove last element (empty string)
        resultArray.pop();

        return (await Promise.all(
            resultArray.map(async (filename) => {
                const stat = await fs.stat(filename);
                const clientPath = new SafePath(tmpClientId, filename, "server").get();

                return {
                    type: stat.isDirectory() ? "folder" : "file",
                    name: pathLib.basename(clientPath),
                    path: pathLib.dirname(clientPath)
                } as SearchDirectoryItem;
            }))
        ).filter(directoryItem => directoryItem.path);
    }

}
