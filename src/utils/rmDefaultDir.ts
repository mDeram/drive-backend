import { promises as fs } from "fs";
import SafePath from "./SafePath";

const rmClientDir = async (clientId: string) => {
    const sp = new SafePath(clientId, "/");
    await fs.rm(sp.getServerPath(), { recursive: true });
}

export default rmClientDir;

