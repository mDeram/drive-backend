import syncFs, { promises as fs } from "fs";
import archiver from "archiver";
import sharp from "sharp";
import express from "express";
import SafePath from "../utils/SafePath";
import { tmpClientId } from "../constants";
const router = express.Router();

//TODO auth
//TODO error middleware
router.get('/cropped/:filename([^/]*)', (req, res) => {
    const sp = new SafePath(tmpClientId, req.params.filename);

    const fileStream = syncFs.createReadStream(sp.getServerPath());
    fileStream.pipe(sharp().resize(100).png()).pipe(res);
});

router.get('/file/:filename([^/]*)', (req, res) => {
    const sp = new SafePath(tmpClientId, req.params.filename);

    res.sendFile(sp.getServerPath(), { dotfiles: "allow" });
});

router.get('/download/:filename([^/]*)', async (req, res) => {
    const isFolder = req.query.folder;
    let filename = req.params.filename;

    // Remove .zip on folders
    if (isFolder) filename = filename.slice(0, -4);

    const sp = new SafePath(tmpClientId, filename);

    let stats;
    try {
        stats = await fs.stat(sp.getServerPath());
    } catch(e) {
        console.error(e)
        res.end();
        return;
    }

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
});

export default router;
