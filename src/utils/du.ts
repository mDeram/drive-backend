import { exec } from "child_process";
import { promisify } from "util";
import SafePath from "./SafePath";
const execAsync = promisify(exec);

const du = async (clientId: string): Promise<number | undefined> => {
    const sp = new SafePath(clientId, "/");

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

export default du;
