import { promises as fs } from "fs";
import { FILES_DIR, TRASH_DIR } from "../constants";
import SafePath from "./SafePath";

const mkDefaultDir = async (clientId: string) => {
    const sp = new SafePath(clientId, "/");
    await fs.mkdir(sp.getServerPath());
    sp.setOrThrow(FILES_DIR);
    await fs.mkdir(sp.getServerPath());
    sp.setOrThrow(TRASH_DIR);
    await fs.mkdir(sp.getServerPath());
}

export default mkDefaultDir;
