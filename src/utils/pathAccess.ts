import pathLib from "path";
import { DRIVE_PATH, FILES_DIR, FILES_PATH, TRASH_DIR, TRASH_PATH } from "../constants";

//TODO create an AllowedPath object
//with permission information like userId and path

export const isPathAllowed = (path: string): boolean => {
    return pathLib.normalize(path).startsWith(DRIVE_PATH);
}

export const isFilesPathAllowed = (path: string): boolean => {
    return pathLib.normalize(path).startsWith(FILES_PATH);
}

export const isTrashPathAllowed = (path: string): boolean => {
    return pathLib.normalize(path).startsWith(TRASH_PATH);
}

export const getPathIfAllowed = (path: string): (string | undefined) => {
    return !isPathAllowed(path) ? undefined : path;
}

export const getFilesPathIfAllowed = (path: string): (string | undefined) => {
    return !isFilesPathAllowed(path) ? undefined : path;
}

export const getTrashPathIfAllowed = (path: string): (string | undefined) => {
    return !isTrashPathAllowed(path) ? undefined : path;
}

export const getFinalPathIfAllowed = (addition: string = ""): (string | undefined) => {
    //fs.realpath ??
    const finalPath = pathLib.join(DRIVE_PATH, addition);
    return getPathIfAllowed(finalPath);
}

export const getFinalFilesPathIfAllowed = (addition: string = ""): (string | undefined) => {
    //fs.realpath ??
    const finalPath = pathLib.join(DRIVE_PATH, addition);
    console.log(finalPath);
    return getFilesPathIfAllowed(finalPath);
}

//trashPermission
export const toTrashPathIfAllowed = (path: string): (string | undefined) => {
    if (!isFilesPathAllowed(pathLib.join(DRIVE_PATH, path))) return;
    return getTrashPathIfAllowed(TRASH_PATH + path.slice(FILES_DIR.length));
}
