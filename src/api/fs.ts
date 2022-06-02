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
const router = express.Router();

router.use((req: RequestSession, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
        res.sendStatus(403) // Forbidden
        return next("router");
    }
    next();
});

router.get('/cropped/:filename([^/]*)', (req: RequestSession, res) => {
    const sp = new SafePath(req.session.clientId!, req.params.filename);

    const fileStream = syncFs.createReadStream(sp.getServerPath());
    fileStream.on("error", () => res.sendStatus(204));
    const resizer = sharp().resize(100).png();
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
