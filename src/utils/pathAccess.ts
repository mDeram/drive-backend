import pathLib from "path";
import { DRIVE_PATH } from "../constants";

//TODO create an AllowedPath object
//with permission information like userId and path

export const isPathAllowed = (path: string): boolean => {
    return path.startsWith(DRIVE_PATH);
}

export const getFinalPathIfAllowed = (addition: string = ""): (string | undefined) => {
    //fs.realpath ??
    const finalPath = pathLib.join(DRIVE_PATH, addition);
    if (!isPathAllowed(finalPath)) return;
    return finalPath;
}

export const getFilePathIfAllowed = (name: string): (string | undefined) => {
    const path = pathLib.dirname(name);
    if (!isPathAllowed(path)) return;
    return path.slice(DRIVE_PATH.length);
}
