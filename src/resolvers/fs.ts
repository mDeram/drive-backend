import { Arg, Ctx, Int, Mutation, Query, UseMiddleware } from "type-graphql";
import { promises as fs } from "fs";
import pathLib from "path";
//import GraphQLUpload, { FileUpload } from "graphql-upload/GraphQLUpload.mjs";
import { finished } from "stream/promises";
import DirectoryItem from "../entities/DirectoryItem";
import { find, grep } from "../utils/search";
import SafePath from "../utils/SafePath";
import { FILES_DIR, TRASH_DIR } from "../constants";
import { fromTrashName } from "../utils/trash";
import TrashDirectoryItem from "../entities/TrashDirectoryItem";
import SearchDirectoryItem from "../entities/SearchDirectoryItem";
import isAuth from "../middlewares/isAuth";
import { MyContext } from "../types";
import du from "../utils/du";
import getSubscriptionSize from "../utils/getSubscriptionSize";
import User from "../entities/User";
import { v4 as uuid } from "uuid";
import { getDownloadLinkKey } from "../redis/keys";

export default class FsResolver {
    @Query(_returns => [DirectoryItem])
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

    @Query(_returns => [TrashDirectoryItem])
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

    @Mutation(_returns => [Boolean])
    @UseMiddleware(isAuth)
    async rm(
        @Arg("paths", _type => [String]) paths: string[],
        @Ctx() { req }: MyContext
    ): Promise<boolean[]> {
        return Promise.all(paths.map(async (toDeletePath) => {
            const sp = new SafePath(req.session.clientId!, toDeletePath);
            if (!sp.isFilesItem() && !sp.isTrashItem()) return false;

            try {
                await fs.rm(sp.getServerPath(), { recursive: true });
            } catch(e) {
                console.error("rm", e);
                return false;
            }
            return true;
        }));
    }

    @Mutation(_returns => [Boolean])
    @UseMiddleware(isAuth)
    async trash(
        @Arg("paths", _type => [String]) paths: string[],
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

    @Mutation(_returns => [Boolean])
    @UseMiddleware(isAuth)
    async restore(
        @Arg("paths", _type => [String]) paths: string[],
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

    /*
    @Mutation(_returns => Boolean)
    @UseMiddleware(isAuth)
    async upload(
        @Arg("path", { defaultValue: "" }) uploadPath: string,
        @Arg("additionalPath", { defaultValue: "" }) additionalPath: string,
        @Arg("file", _type => GraphQLUpload) file: FileUpload,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        const { createReadStream, filename, mimetype, encoding } = await file;
        const clientId = req.session.clientId!;

        const safeOutPath = new SafePath(clientId, pathLib.join(uploadPath, additionalPath, filename));
        if (!safeOutPath.isFilesItem()) return false;

        const diskUsage = await du(clientId);
        if (!diskUsage) return false;

        const user = await User.findOneByOrFail({ id: req.session.userId });
        const maxUsage = getSubscriptionSize(user.currentSubscription);

        if (diskUsage > maxUsage) return false;
        const safeDirPath = new SafePath(clientId, pathLib.dirname(safeOutPath.get()));
        await fs.mkdir(safeDirPath.getServerPath(), { recursive: true });

        let totalLength = 0;
        let cancelUpload = false;

        let outFile;
        while (!outFile) {
            try {
                outFile = await fs.open(safeOutPath.getServerPath(), "wx"); // "wx" -> write, fail if path exists already
            } catch(e) {
                if (e.code !== "EEXIST") {
                    console.error("file upload cannot write file", e)
                    return false
                }

                // Filename already exist. So we add a suffix to the filename like myfile(2)
                const dirname = pathLib.dirname(safeOutPath.get());
                const basename = pathLib.basename(safeOutPath.get());
                const extname = pathLib.extname(basename);

                const basenameWithoutExtname = extname.length
                    ? basename.slice(0, - extname.length)
                    : basename;

                // The regex match "([0-9])" at the end of the name and create a
                // group to get the number
                const suffixMatch = basenameWithoutExtname.match(/\((\d+)\)$/);

                const newBasenameWithoutExtname = suffixMatch
                    ? basenameWithoutExtname.slice(0, - suffixMatch[0].length)
                    : basenameWithoutExtname;

                const newSuffixNumber = suffixMatch
                    ? parseInt(suffixMatch[1]) + 1
                    : 1;

                safeOutPath.setOrThrow(pathLib.join(dirname, newBasenameWithoutExtname + "(" + newSuffixNumber + ")" + extname));
            }
        }

        const out = outFile.createWriteStream();
        const stream = createReadStream();
        stream.on("error", console.error);
        stream.on("data", (chunk) => {
            totalLength += chunk.length;
            if (diskUsage + (totalLength / 1024) > maxUsage) {
                stream.destroy();
                out.destroy();
                cancelUpload = true;
            }
        });
        out.on("error", console.error);
        stream.pipe(out);

        try {
            await finished(out);
        } catch(e) {
            console.error("upload", e);
            cancelUpload = true;
        }

        if (cancelUpload) {
            try {
                await fs.rm(safeOutPath.getServerPath());
            } catch(e) { console.error("rm upload", e) }
            return false;
        }

        return true;
    }
    */

    @Mutation(_returns => Boolean)
    @UseMiddleware(isAuth)
    async mkdir(
        @Arg("dirname") dirname: string,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        const clientId = req.session.clientId!;
        const sp = new SafePath(clientId, dirname);
        if (!sp.isFilesItem()) return false;

        const diskUsage = await du(clientId);
        if (!diskUsage) return false;

        const user = await User.findOneByOrFail({ id: req.session.userId });
        const maxUsage = getSubscriptionSize(user.currentSubscription);

        if (diskUsage > maxUsage) return false;

        try {
            await fs.mkdir(sp.getServerPath());
        } catch(e) {
            console.error("mkdir", e);
            return false;
        }
        return true;
    }

    @Query(_returns => Int)
    @UseMiddleware(isAuth)
    async diskUsage(
        @Ctx() { req }: MyContext
    ): Promise<number | undefined> {
        return du(req.session.clientId!);
    }

    @Query(_returns => [SearchDirectoryItem])
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
                const safePath = new SafePath(req.session.clientId!, filename, "server");
                const clientPath = safePath.get();
                const stat = await fs.stat(safePath.getServerPath());

                return {
                    type: stat.isDirectory() ? "folder" : "file",
                    name: pathLib.basename(clientPath),
                    path: pathLib.dirname(clientPath)
                } as SearchDirectoryItem;
            }))
        ).filter(directoryItem => directoryItem.path);
    }

    @Mutation(_returns => String)
    @UseMiddleware(isAuth)
    async downloadLink(
        @Arg("paths", _type => [String]) paths: string[],
        @Ctx() { req, redis }: MyContext
    ): Promise<string> {
        if (!paths.length) throw new Error("Need at least one path to create a download link");

        const id = uuid();
        await redis.set(getDownloadLinkKey(req.session.clientId!, id), JSON.stringify(paths), "EX", 60 * 10);
        return id;
    }
}
