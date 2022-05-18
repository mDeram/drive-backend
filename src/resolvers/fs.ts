import { Arg, Ctx, Int, Mutation, Query, UseMiddleware } from "type-graphql";
import syncFs, { promises as fs } from "fs";
import pathLib from "path";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { finished } from "stream/promises";
import DirectoryItem from "../entities/DirectoryItem";
import { exec } from "child_process";
import { promisify } from "util";
import { find, grep } from "../utils/search";
import SafePath from "../utils/SafePath";
import { FILES_DIR, TRASH_DIR } from "../constants";
import { fromTrashName } from "../utils/trash";
import TrashDirectoryItem from "../entities/TrashDirectoryItem";
import SearchDirectoryItem from "../entities/SearchDirectoryItem";
import isAuth from "../middlewares/isAuth";
import { MyContext } from "../types";
const execAsync = promisify(exec);

export default class FsResolver {
    @Query(() => [DirectoryItem])
    @UseMiddleware(isAuth)
    async ls(
        @Arg("path", { defaultValue: "/files" }) searchPath: string,
        @Ctx() { req }: MyContext
    ): Promise<DirectoryItem[]> {
        const sp = new SafePath(req.session.clientId!, searchPath);

        const content = await fs.readdir(sp.getServerPath(), { withFileTypes: true })
        return content.map(item => ({
            type: item.isDirectory() ? "folder" : "file",
            name: item.name
        }));
    }

    @Query(() => [TrashDirectoryItem])
    @UseMiddleware(isAuth)
    async lsTrash(
        @Ctx() { req }: MyContext
    ): Promise<TrashDirectoryItem[]> {
        const sp = new SafePath(req.session.clientId!, TRASH_DIR);

        const content = await fs.readdir(sp.getServerPath(), { withFileTypes: true })

        return content.map(item => {
            const data = fromTrashName(item.name);
            if (!data) return;

            return {
                type: item.isDirectory() ? "folder" : "file",
                ...data
            };
        }).filter(item => item) as TrashDirectoryItem[];
    }

    @Mutation(() => [Boolean])
    @UseMiddleware(isAuth)
    async rm(
        @Arg("paths", type => [String]) paths: string[],
        @Ctx() { req }: MyContext
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toDeletePath) => {
            const sp = new SafePath(req.session.clientId!, toDeletePath);

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
    @UseMiddleware(isAuth)
    async trash(
        @Arg("paths", type => [String]) paths: string[],
        @Ctx() { req }: MyContext
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toTrashPath) => {
            const sp = new SafePath(req.session.clientId!, toTrashPath);
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
    @UseMiddleware(isAuth)
    async restore(
        @Arg("paths", type => [String]) paths: string[],
        @Ctx() { req }: MyContext
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toTrashPath) => {
            const sp = new SafePath(req.session.clientId!, toTrashPath);
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
    @UseMiddleware(isAuth)
    async upload(
        @Arg("path", { defaultValue: "" }) uploadPath: string,
        @Arg("additionalPath", { defaultValue: "" }) additionalPath: string,
        @Arg("file", type => GraphQLUpload) file: FileUpload,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        const { createReadStream, filename, mimetype, encoding } = await file;

        const safeOutPath = new SafePath(req.session.clientId!, pathLib.join(uploadPath, additionalPath, filename));
        const safeDirPath = new SafePath(req.session.clientId!, pathLib.join(uploadPath, additionalPath));

        await fs.mkdir(safeDirPath.getServerPath(), { recursive: true });

        const stream = createReadStream();
        stream.on("error", console.error);
        const out = syncFs.createWriteStream(safeOutPath.getServerPath());
        out.on("error", console.error);
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
    @UseMiddleware(isAuth)
    async mkdir(
        @Arg("dirname") dirname: string,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        const sp = new SafePath(req.session.clientId!, dirname);

        try {
            await fs.mkdir(sp.getServerPath());
        } catch(e) {
            console.error("mkdir", e);
            return false;
        }
        return true;
    }

    @Query(() => Int)
    @UseMiddleware(isAuth)
    async diskUsage(
        @Ctx() { req }: MyContext
    ): Promise<number | undefined> {
        const sp = new SafePath(req.session.clientId!, "/");

        try {
            //TODO security check can finalPath inject commands?
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
    @UseMiddleware(isAuth)
    async search(
        @Arg("pattern") pattern: string,
        @Ctx() { req }: MyContext
    ): Promise<SearchDirectoryItem[]> {
        const sp = new SafePath(req.session.clientId!, FILES_DIR);

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
                const clientPath = new SafePath(req.session.clientId!, filename, "server").get();

                return {
                    type: stat.isDirectory() ? "folder" : "file",
                    name: pathLib.basename(clientPath),
                    path: pathLib.dirname(clientPath)
                } as SearchDirectoryItem;
            }))
        ).filter(directoryItem => directoryItem.path);
    }

}
