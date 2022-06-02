import SafePath from "./SafePath";
import { expect } from "chai";
import { DRIVE_PATH, FILES_DIR, TRASH_DIR } from "../constants";
import pathLib from "path";
import { fromTrashName, generateTrashName } from "./trash";

describe("SafePath unit tests", () => {
    const CLIENT_ID = "arst";
    const INVALID_CLIENT_ID = "../" + CLIENT_ID;
    const ROOT_DIR = "/";
    const GO_UP_PATH = "../";
    const A_NAME = "a";
    const A_PATH = "/" + A_NAME;
    const A_LONG_PATH = "/a/b";
    const A_LONG_TRASH_PATH = generateTrashName(pathLib.join(TRASH_DIR, A_LONG_PATH));
    const A_FILES_PATH = pathLib.join(FILES_DIR, A_PATH);

    const A_TRASH_BASENAME = generateTrashName(A_NAME);
    const A_TRASH_ITEM = pathLib.join(TRASH_DIR, A_TRASH_BASENAME);
    const TRASH_DATA = fromTrashName(A_TRASH_BASENAME);

    describe("constructor", () => {
        it("constructor with GO_UP_PATH throw", () => {
            expect(() => new SafePath(CLIENT_ID, GO_UP_PATH)).to.throw("Invalid path");
        });
        it("constructor with INVALID_CLIENT_ID throw", () => {
            expect(() => new SafePath(INVALID_CLIENT_ID, FILES_DIR)).to.throw("Invalid clientId");
        });
        it("constructor with ROOT_DIR do not throw", () => {
            expect(() => new SafePath(CLIENT_ID, ROOT_DIR)).to.not.throw();
        });
        it("constructor with A_PATH throw", () => {
            expect(() => new SafePath(CLIENT_ID, A_PATH)).to.throw("Invalid path");
        });
        it("constructor with A_TRASH_ITEM do not throw", () => {
            expect(() => new SafePath(CLIENT_ID, A_TRASH_ITEM)).to.not.throw();
        });
        it("constructor with A_LONG_TRASH_PATH throw", () => {
            expect(() => new SafePath(CLIENT_ID, A_LONG_TRASH_PATH)).to.throw("Invalid path");
        });
        it("constructor with TRASH_DIR throw", () => {
            expect(() => new SafePath(CLIENT_ID, TRASH_DIR)).to.not.throw();
        });

        it("constructor with ROOT_DIR server path throw", () => {
            expect(() => new SafePath(CLIENT_ID, ROOT_DIR, "server")).to.throw("Invalid path");
        });
        it("constructor with DRIVE_PATH + CLIENT_ID + / server path to not throw", () => {
            const serverClientPath = pathLib.join(DRIVE_PATH, CLIENT_ID, "/");
            expect(() => new SafePath(CLIENT_ID, serverClientPath, "server")).to.not.throw();
        });

        it("constructor with FILES_DIR + \"a\" throw", () => {
            expect(() => new SafePath(CLIENT_ID, FILES_DIR + "a")).to.throw("Invalid path");
        });
        it("constructor with TRASH_DIR + \"a\" throw", () => {
            expect(() => new SafePath(CLIENT_ID, TRASH_DIR + "a")).to.throw("Invalid path");
        });
    });

    describe("getters", () => {
        it("get with ROOT_DIR return ROOT_DIR", () => {
            const sp = new SafePath(CLIENT_ID, ROOT_DIR);
            expect(sp.get()).to.equal(ROOT_DIR);
        });
        it("getServerPath with ROOT_DIR return DRIVE_PATH + CLIENT_ID + ROOT_DIR", () => {
            const sp = new SafePath(CLIENT_ID, ROOT_DIR);
            expect(sp.getServerPath()).to.equal(pathLib.join(DRIVE_PATH, CLIENT_ID, ROOT_DIR));
        });
        it("getTrashDataOrThrow with A_TRASH_ITEM return TRASH_DATA", () => {
            const sp = new SafePath(CLIENT_ID, A_TRASH_ITEM);
            expect(sp.getTrashDataOrThrow()).to.deep.equal(TRASH_DATA);
        });
    });

    describe("modificators", () => {
        it("filesItemToTrashItemOrThrow with FILES_DIR + A_PATH with get return TRASH_DIR + A_PATH", () => {
            const sp = new SafePath(CLIENT_ID, FILES_DIR + A_PATH);
            sp.filesItemToTrashItemOrThrow();
            expect(sp.get()).to.equal(TRASH_DIR + A_PATH);
        })
        it("filesItemToTrashItemOrThrow with ROOT_DIR throw", () => {
            const sp = new SafePath(CLIENT_ID, ROOT_DIR);
            expect(() => sp.filesItemToTrashItemOrThrow()).to.throw("Invalid files item");
        });

        it("trashItemToFilesItemOrThrow with A_TRASH_ITEM with get return TRASH_DIR + A_PATH", () => {
            const sp = new SafePath(CLIENT_ID, A_TRASH_ITEM);
            sp.trashItemToFilesItemOrThrow();
            expect(sp.get()).to.equal(FILES_DIR + A_PATH);
        })
        it("trashItemToFilesItemOrThrow with ROOT_DIR throw", () => {
            const sp = new SafePath(CLIENT_ID, ROOT_DIR);
            expect(() => sp.trashItemToFilesItemOrThrow()).to.throw("Invalid trash item");
        });
    });

    describe("checkers", () => {
        it("isRootPath with ROOT_DIR return true", () => {
            const sp = new SafePath(CLIENT_ID, ROOT_DIR);
            expect(sp.isRootPath()).to.equal(true);
        });
        it("isRootPath with FILES_DIR return false", () => {
            const sp = new SafePath(CLIENT_ID, FILES_DIR);
            expect(sp.isRootPath()).to.equal(false);
        });

        it("isFilesPath with FILES_DIR return true", () => {
            const sp = new SafePath(CLIENT_ID, FILES_DIR);
            expect(sp.isFilesPath()).to.equal(true);
        });
        it("isFilesPath with ROOT_DIR return false", () => {
            const sp = new SafePath(CLIENT_ID, ROOT_DIR);
            expect(sp.isFilesPath()).to.equal(false);
        });
        it("isFilesPath with A_FILES_PATH return false", () => {
            const sp = new SafePath(CLIENT_ID, A_FILES_PATH);
            expect(sp.isFilesPath()).to.equal(false);
        });

        it("isTrashPath with TRASH_DIR return true", () => {
            const sp = new SafePath(CLIENT_ID, TRASH_DIR);
            expect(sp.isTrashPath()).to.equal(true);
        });
        it("isTrashPath with ROOT_DIR return false", () => {
            const sp = new SafePath(CLIENT_ID, ROOT_DIR);
            expect(sp.isTrashPath()).to.equal(false);
        });
        it("isTrashPath with A_TRASH_ITEM return false", () => {
            const sp = new SafePath(CLIENT_ID, A_TRASH_ITEM);
            expect(sp.isTrashPath()).to.equal(false);
        });

        it("isFilesItem with A_FILES_PATH return true", () => {
            const sp = new SafePath(CLIENT_ID, A_FILES_PATH);
            expect(sp.isFilesItem()).to.equal(true);
        });
        it("isFilesItem with FILES_DIR return false", () => {
            const sp = new SafePath(CLIENT_ID, FILES_DIR);
            expect(sp.isFilesItem()).to.equal(false);
        });

        it("isTrashItem with A_TRASH_ITEM return true", () => {
            const sp = new SafePath(CLIENT_ID, A_TRASH_ITEM);
            expect(sp.isTrashItem()).to.equal(true);
        });
        it("isTrashItem with TRASH_DIR return false", () => {
            const sp = new SafePath(CLIENT_ID, TRASH_DIR);
            expect(sp.isTrashItem()).to.equal(false);
        });
    });
});
