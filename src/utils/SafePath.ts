import pathLib from "path";
import { DRIVE_PATH, FILES_DIR, TRASH_DIR } from "../constants";
import { fromTrashName, generateTrashName, TrashData } from "./trash";

export type PathType = "client" | "server";

/*
 * path can be one of those 5 possibilities
 *
 * root /
 * files /files
 * trash /trash
 * files item /files/.*
 * trash item /trash/(^/.)* // this one means no nested folder after /trash
 */

/**
 * A module to safely use paths
 */
class SafePath {
    /**
     * Server path: DRIVE_PATH + clientId + additional path
     */
    #path: string;
    #clientId: string;
    /**
     * Normalized path of DRIVE_PATH with the cliendId
     */
    #basePath: string;



    /**
     * Create a safe path
     * Throw an error if the clientId or the path are invalid
     */
    constructor(clientId: string, path: string, pathType: PathType = "client") {
        this.#setClientIdOrThrow(clientId);
        this.setOrThrow(path, pathType);
    }

    /**
     * Set the clientId
     * Throw an error if the cliendId is invalid
     */
    #setClientIdOrThrow(clientId: string) {
        const normalizedBasePath = pathLib.join(DRIVE_PATH, clientId, "/");

        const normalizedDirname = pathLib.dirname(normalizedBasePath);
        if (normalizedDirname !== DRIVE_PATH) throw new Error("Invalid clientId");

        this.#clientId = clientId;
        this.#basePath = normalizedBasePath;
    }

    /**
     * Set a new path
     * Throw if the path is invalid
     * A path is invalid when the normalized path is invalid and if the
     * normalized path does not match any valid type
     */
    setOrThrow(path: string, pathType: PathType = "client") {
        this.#setNormalizedPathOrThrow(path, pathType);
        if (!this.isRootPath()
         && !this.isFilesPath()
         && !this.isTrashPath()
         && !this.isFilesItem()
         && !this.isTrashItem()) {
            throw new Error("Invalid path");
        }
    }

    /**
     * Set the normalized path
     * Throw if the normalized path does not starts with DRIVE_PATH + clientId
     */
    #setNormalizedPathOrThrow(path: string, pathType: PathType) {
        let normalizedPath: string;
        if (pathType === "client") normalizedPath = pathLib.join(this.#basePath, path);
        if (pathType === "server") normalizedPath = pathLib.normalize(path);

        if (!normalizedPath!.startsWith(this.#basePath)) throw new Error("Invalid path");

        this.#path = normalizedPath!;
    }

    #getTrashDataOrNull(): TrashData | null {
        return fromTrashName(pathLib.basename(this.#path));
    }

    /**
     * Get the trash data
     * Throw if the path is not a trash item
     */
    getTrashDataOrThrow(): TrashData {
        if (!this.isTrashItem()) throw new Error("Path is not a trash item");
        return this.#getTrashDataOrNull()!;
    }

    /**
     * Get the user path, can be shared publicly
     */
    get() {
        let finalPath = this.#path;
        if (this.isTrashItem()) {
            const name = this.#getTrashDataOrNull()!.name;
            finalPath = pathLib.join(pathLib.dirname(this.#path), name);
        }
        return finalPath.slice(this.#basePath.length - 1);
    }

    /**
     * Get the path on the disk, should not be shared publicly
     */
    getServerPath() {
        return this.#path;
    }

    /**
     * Try to turn a files item into a trash item
     * Throw if the initial path is not a files item
     */
    filesItemToTrashItemOrThrow() {
        if (!this.isFilesItem()) throw new Error("Invalid files item");

        const clientPath = this.get();
        const name = pathLib.join(TRASH_DIR, pathLib.basename(clientPath));
        const trashItem = generateTrashName(name);

        this.setOrThrow(trashItem);
    }

    /**
     * Try to turn a trash item into a files item
     * Throw if the initial path is not a trash item
     */
    trashItemToFilesItemOrThrow() {
        if (!this.isTrashItem()) throw new Error("Invalid trash item");

        const clientPath = this.getServerPath();
        const name = pathLib.join(FILES_DIR, pathLib.basename(clientPath));
        const filesItem = fromTrashName(name)!.name;

        this.setOrThrow(filesItem);
    }

    /**
     * Returns a boolean indicating if the path if equal to DRIVE_PATH + clientId
     */
    isRootPath(): boolean {
        //console.log(this.#basePath, this.#path);
        return this.#basePath === this.#path;
    }

    /**
     * Returns a boolean indicating if the path if equal to
     * DRIVE_PATH + clientId + FILES_DIR
     */
    isFilesPath(): boolean {
        return pathLib.join(this.#basePath, FILES_DIR) === this.#path;
    }

    /**
     * Returns a boolean indicating if the path if equal to
     * DRIVE_PATH + clientId + TRASH_DIR
     */
    isTrashPath(): boolean {
        return pathLib.join(this.#basePath, TRASH_DIR) === this.#path;
    }

    /**
     * Returns a boolean indicating if the dirname of the path starts with
     * DRIVE_PATH + clientId + FILES_DIR
     */
    isFilesItem(): boolean {
        const dirname = pathLib.dirname(this.#path);
        return dirname.startsWith(pathLib.join(this.#basePath, FILES_DIR));
    }

    /**
     * Returns a boolean indicating if the dirname of the path is equal to
     * DRIVE_PATH + clientId + TRASH_DIR and if the trash data of the basename
     * is valid
     */
    isTrashItem(): boolean {
        const dirname = pathLib.dirname(this.#path);
        const isPathValid = pathLib.join(this.#basePath, TRASH_DIR) === dirname;
        const isTrashDataValid = !!this.#getTrashDataOrNull();
        return (isPathValid && isTrashDataValid);
    }
}

export default SafePath;
