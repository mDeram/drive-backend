import pathLib from "path";
import { DRIVE_PATH, FILES_DIR, TRASH_DIR } from "../constants";
import { fromTrashName, toTrashName, trashData } from "./trash";

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
     * Throw an error if the cliendId or the clientPath are invalid
     */
    constructor(clientId: string, clientPath: string) {
        this.#setClientIdOrThrow(clientId);
        this.setOrThrow(clientPath);
    }

    /**
     * Throw an error if the cliendId is invalid
     */
    #setClientIdOrThrow(clientId: string) {
        const normalizedBasePath = pathLib.join(DRIVE_PATH, clientId);
        if (!normalizedBasePath.startsWith(DRIVE_PATH)) throw new Error("Invalid clientId");

        this.#clientId = clientId;
        this.#basePath = normalizedBasePath;
    }

    /**
     * Try to set a new clientPath on the SafePath instance
     */
    setOrThrow(clientPath: string) {
        this.#path = this.#getNormalizedPathOrThrow(clientPath);
        this.#throwOnTrashItemLike();
    }

    getTrashDataOrThrow(): trashData {
        const trashData = fromTrashName(pathLib.basename(this.#path));
        if (!this.isTrashItem() || !trashData) throw new Error("Invalid trash data");

        return trashData;
    }

    /**
     * Get the user path, can be shared publicly
     */
    get() {
        let finalPath = this.#path;
        if (this.isTrashItem()) {
            const name = this.getTrashDataOrThrow().name;
            finalPath = pathLib.join(pathLib.dirname(this.#path), name);
        }
        return finalPath.slice(this.#basePath.length);
    }

    /**
     * Get the path on the disk
     */
    getServerPath() {
        return this.#path;
    }

    /**
     * Try to turn a files item into a trash item
     */
    filesItemToTrashItemOrThrow() {
        if (!this.isFilesItem()) throw new Error("Invalid files item");

        const clientPath = this.get();
        const name = pathLib.join(TRASH_DIR, pathLib.basename(clientPath));
        const trashItem = toTrashName(name);

        this.setOrThrow(trashItem);
    }

    trashItemToFilesItemOrThrow() {
        if (!this.isTrashItem()) throw new Error("Invalid trash item");

        const clientPath = this.getServerPath();
        const name = pathLib.join(FILES_DIR, pathLib.basename(clientPath));
        const filesItem = fromTrashName(name)!.name;

        this.setOrThrow(filesItem);
    }

    /**
     * Compute the normalized path, if the path is valid:
     * starts with the DRIVE_PATH + cliendId return true
     * otherwise throw
     */
    #getNormalizedPathOrThrow(path: string): string {
        const normalizedPath = pathLib.join(this.#basePath, path);
        if (!normalizedPath.startsWith(this.#basePath)) throw new Error("Invalid path");

        return normalizedPath;
    }

    /**
     * Return true when the path contain the FILES_DIR at the right place
     * otherwise return false
     */
    hasFilesPath(): boolean {
        return this.#path.startsWith(pathLib.join(this.#basePath, FILES_DIR));
    }

    /**
     * Return true when the path is a valid files item
     * A valid files item have a path like:
     * DRIVE_PATH + cliendId + TRASH_DIR + any_path
     * otherwise return false
     */
    isFilesItem(): boolean {
        const pathLenghtGreaterThanFilesPath = this.#path.length > pathLib.join(this.#basePath, FILES_DIR).length;
        return this.hasFilesPath() && pathLenghtGreaterThanFilesPath;
    }

    /*
     * Return true when the path contain the TRASH_DIR at the right place
     * otherwise return false
     */
    hasTrashPath(): boolean {
        return this.#path.startsWith(pathLib.join(this.#basePath, TRASH_DIR));
    }

    /**
     * Return true when the path is a valid trash item
     * A valid trash item have a path like:
     * DRIVE_PATH + cliendId + TRASH_DIR + /a_path_with_a_single_slash
     * otherwise return false
     */
    isTrashItem(): boolean {
        const pathEqualToTrashPath = pathLib.dirname(this.#path) === pathLib.join(this.#basePath, TRASH_DIR);
        return this.hasTrashPath() && pathEqualToTrashPath;
    }

    /**
     * If the item is trash like but not a trash item throws.
     * Meaning it has a trash path but is not the trash dir and the basename
     * is equal to the trash dir respecting the flat trash directory.
     */
    #throwOnTrashItemLike() {
        if (!this.hasTrashPath()) return;
        const isTrashDir = this.#path === pathLib.join(this.#basePath, TRASH_DIR);
        if (isTrashDir) return;

        const pathEqualToTrashPath = pathLib.dirname(this.#path) === pathLib.join(this.#basePath, TRASH_DIR);
        if (!pathEqualToTrashPath) throw new Error("Invalid trash path");

        this.getTrashDataOrThrow();
    }
}

export default SafePath;
