import syncFs, { promises as fs } from "fs";
import archiver from "archiver";
import sharp from "sharp";
import express, { Request, Response, NextFunction } from "express";
import SafePath from "../utils/SafePath";
import asyncHandler from "express-async-handler";
import { RequestSession } from "../types";
import { getDownloadLinkKey } from "../redis/keys";
import { redis } from "../index";
import pathLib from "path";
import busboy from "busboy";
import du from "../utils/du";
import { finished } from "stream/promises";
import User from "../entities/User";
import getSubscriptionSize from "../utils/getSubscriptionSize";

const router = express.Router();

router.use((req: RequestSession, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
        res.sendStatus(403) // Forbidden
        return next("router");
    }
    next();
});

router.post('/upload', asyncHandler(async (req: RequestSession, res) => {
    const clientId = req.session.clientId!;
    const uploadPath = req.query.path;
    const additionalPath = req.query.additionalPath;
    if (typeof uploadPath !== "string") {
        res.status(400).json("path query param should be a string");
        return;
    }
    if (typeof additionalPath !== "string") {
        res.status(400).json("additionalPath query param should be a string");
        return;
    }

    const bb = busboy({ headers: req.headers });
    bb.on("file", async (_name, file, info) => {
        const { filename, encoding, mimeType } = info;

        const safeOutPath = new SafePath(clientId, pathLib.join(uploadPath, additionalPath, filename));
        if (!safeOutPath.isFilesItem()) {
            res.status(400).json("Invalid path and/or additionalPath");
            return;
        }

        const diskUsage = await du(clientId);
        if (!diskUsage) {
            res.status(500).json("Internal Server Error");
            return;
        }

        const user = await User.findOneByOrFail({ id: req.session.userId });
        const maxUsage = getSubscriptionSize(user.currentSubscription);

        if (diskUsage > maxUsage) {
            res.status(413).json("User storage exceeded");
            return;
        }
        const safeDirPath = new SafePath(clientId, pathLib.dirname(safeOutPath.get()));
        await fs.mkdir(safeDirPath.getServerPath(), { recursive: true });

        let outFile;
        while (!outFile) {
            try {
                outFile = await fs.open(safeOutPath.getServerPath(), "wx"); // "wx" -> write, fail if path exists already
            } catch(e) {
                if (e.code !== "EEXIST") {
                    console.error("file upload cannot write file", e)
                    res.status(500).json("Internal Server Error");
                    return;
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

        let totalLength = 0;
        let error;

        const out = outFile.createWriteStream();
        file.on("error", console.error);
        file.on("data", (chunk) => {
            totalLength += chunk.length;
            if (diskUsage + (totalLength / 1024) > maxUsage) {
                file.destroy();
                out.destroy();
                error = { code: 413, message: "User storage exceeded" };
            }
        });
        out.on("error", console.error);
        file.pipe(out);

        try {
            await finished(out);
            res.status(201).json(true);
            return;
        } catch(e) {
            console.error("upload", e);
            error = { code: 500, message: "Could not save file due to a server error" };
        }

        try {
            await fs.rm(safeOutPath.getServerPath());
        } catch(err) {
            console.error("error occured when trying to rm upload", err);
        }

        res.status(error.code).json(error.message);
    });

    req.pipe(bb);
}));

// TODO test if response is correct when no file found
router.get('/cropped/:filename([^/]*)', (req: RequestSession, res) => {
    const sp = new SafePath(req.session.clientId!, req.params.filename);

    const fileStream = syncFs.createReadStream(sp.getServerPath());
    const resizer = sharp().resize(100).png();

    fileStream.on("error", () => res.sendStatus(204));
    resizer.on("error", () => res.sendStatus(204));

    fileStream.pipe(resizer).pipe(res);
});

router.get('/download/:id([^/]*)', asyncHandler(async (req: RequestSession, res) => {
    const clientId = req.session.clientId!;
    const id = req.params.id;

    const result = await redis.get(getDownloadLinkKey(clientId, id));
    if (!result) throw new Error("Download not found");
    const paths = JSON.parse(result) as string[];

    if (paths.length === 1) {
        const sp = new SafePath(clientId, paths[0]);
        const name = pathLib.basename(sp.get());
        const stats = await fs.stat(sp.getServerPath());
        if (stats.isFile()) {
            res.download(sp.getServerPath(), name, { dotfiles: "allow" });
            return;
        }
        res.setHeader("Content-Disposition", `attachment; filename="${name}.zip"`);
    } else {
        res.setHeader("Content-Disposition", "attachment; filename=\"Drive.zip\"");
    }

    // Handle multiple files zip and then download
    const archive = archiver("zip");
    archive.on("error", (e: any) => {
        console.error("archive", e)
        res.end();
    });
    archive.pipe(res);
    await Promise.all(paths.map(async (path) => {
        const sp = new SafePath(clientId, path);
        const name = pathLib.basename(sp.get());
        const stats = await fs.stat(sp.getServerPath());

        if (stats.isDirectory()) archive.directory(sp.getServerPath(), name);
        if (stats.isFile())      archive.file(sp.getServerPath(), { name });
    }));
    archive.finalize();
}));

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500);
    res.end();
});

export default router;
