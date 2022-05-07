import pathLib from "path";
import { DRIVE_PATH } from "../constants";

const getFinalPathIfAllowed = (addition: string = ""): (string | undefined) => {
    //fs.realpath ??
    const finalPath = pathLib.join(DRIVE_PATH, addition);
    if (!finalPath.startsWith(DRIVE_PATH))
        return;
    return finalPath;
}

export default getFinalPathIfAllowed;
