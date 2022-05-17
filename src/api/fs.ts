import syncFs, { promises as fs } from "fs";
import archiver from "archiver";
import sharp from "sharp";
import express, { Request, Response, NextFunction } from "express";
import SafePath from "../utils/SafePath";
import { tmpClientId } from "../constants";
import asyncHandler from "express-async-handler";
const router = express.Router();

//TODO auth
router.get('/cropped/:filename([^/]*)', (req, res, next) => {
    const sp = new SafePath(tmpClientId, req.params.filename);

    const fileStream = syncFs.createReadStream(sp.getServerPath());
    fileStream.on("error", () => res.sendStatus(204));
    const resizer = sharp().resize(100).png();
    resizer.on("error", () => res.sendStatus(204));
    fileStream.pipe(resizer).pipe(res);
});

router.get('/file/:filename([^/]*)', (req, res) => {
    const sp = new SafePath(tmpClientId, req.params.filename);

    res.sendFile(sp.getServerPath(), { dotfiles: "allow" });
});

router.get('/download/:filename([^/]*)', asyncHandler(async (req, res) => {
    const isFolder = req.query.folder;
    let filename = req.params.filename;

    // Remove .zip on folders
    if (isFolder) filename = filename.slice(0, -4);

    const sp = new SafePath(tmpClientId, filename);

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

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500);
    res.end();
});

export default router;
