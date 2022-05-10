import { getFinalPathIfAllowed } from "../utils/pathAccess";
import syncFs, { promises as fs } from "fs";
import archiver from "archiver";
import sharp from "sharp";
import express from "express";
const router = express.Router();

router.get('/cropped/:name([^/]*)', (req, res) => {
    const finalPath = getFinalPathIfAllowed(req.params.name);
    if (!finalPath) {
        res.end();
        return;
    }

    const fileStream = syncFs.createReadStream(finalPath);
    fileStream.pipe(sharp().resize(100).png()).pipe(res);
});

router.get('/file/:name([^/]*)', (req, res) => {
    //if(!req.query.user){
    //const username = req.query.userId;
    const finalPath = getFinalPathIfAllowed(req.params.name);
    if (!finalPath) {
        res.end();
        return;
    }

    res.sendFile(finalPath, { dotfiles: "allow" });
    /*} else {
        res.end();
    } */
});

router.get('/download/:name([^/]*)', async (req, res) => {
    const isFolder = req.query.folder;
    let name = req.params.name;

    // Remove .zip on folders
    if (isFolder) name = name.slice(0, -4);

    const finalPath = getFinalPathIfAllowed(name);
    if (!finalPath) {
        res.end();
        return;
    }

    let stats;
    try {
        stats = await fs.stat(finalPath);
    } catch(e) {
        console.error(e)
        res.end();
        return;
    }

    if (!isFolder && stats.isFile()) {
        res.download(finalPath, req.params.name, { dotfiles: "allow" });
        return;
    }

    if (isFolder && stats.isDirectory()) {
        const archive = archiver("zip");
        archive.on("error", (e: any) => {
            console.error(e)
            res.end();
        });
        archive.pipe(res);
        archive.directory(finalPath, name);
        archive.finalize();
        return;
    }

    res.end();
});

export default router;
