import syncFs, { promises as fs } from "fs";
import archiver from "archiver";
import sharp from "sharp";
import express, { Request, Response, NextFunction } from "express";
import SafePath from "../utils/SafePath";
import asyncHandler from "express-async-handler";
import { RequestSession } from "../types";
const router = express.Router();

router.use((req: RequestSession, res: Response, next: NextFunction) => {
    //TODO test if it works as intended
    if (!req.session.userId) res.sendStatus(403); // Forbidden
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

router.get('/file/:filename([^/]*)', (req: RequestSession, res) => {
    const sp = new SafePath(req.session.clientId!, req.params.filename);

    res.sendFile(sp.getServerPath(), { dotfiles: "allow" });
});

router.get('/download/:filename([^/]*)', asyncHandler(async (req: RequestSession, res) => {
    const isFolder = req.query.folder;
    let filename = req.params.filename;

    // Remove .zip on folders
    if (isFolder) filename = filename.slice(0, -4);

    const sp = new SafePath(req.session.clientId!, filename);

    const stats = await fs.stat(sp.getServerPath());

    if (!isFolder && stats.isFile()) {
        res.download(sp.getServerPath(), req.params.filename, { dotfiles: "allow" });
        return;
    }

    if (isFolder && stats.isDirectory()) {
        const archive = archiver("zip");
        archive.on("error", (e: any) => {
            console.error("archive", e)
            res.end();
        });
        archive.pipe(res);
        archive.directory(sp.getServerPath(), filename);
        archive.finalize();
        return;
    }

    res.end();
}));

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500);
    res.end();
});

export default router;
