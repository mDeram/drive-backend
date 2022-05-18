import { expect } from "chai";
import { generateTrashName, toTrashName, fromTrashName, TrashData } from "./trash";
import { validate as uuidValidate } from "uuid";

function getValidatedTrashData(trashData: TrashData | null): TrashData {
    expect(trashData).to.be.not.null;

    const { name, time, id } = trashData!;
    expect((new Date(parseInt(time))).getTime().toString()).to.equal(time);
    expect(uuidValidate(id)).to.be.true;

    return { name, time, id };
}

describe("Trash functions unit tests", () => {
    it("generateTrashName with empty string return a valid trash name", () => {
        const trashName = generateTrashName("");
        const trashData = fromTrashName(trashName);

        const { name } = getValidatedTrashData(trashData);
        expect(name).to.be.equal("");
    });

    it("generateTrashName with string containing dots return a valid trash name", () => {
        const stringWithDots = ".a."
        const trashName = generateTrashName(stringWithDots);
        const trashData = fromTrashName(trashName);

        const { name } = getValidatedTrashData(trashData);
        expect(name).to.be.equal(stringWithDots);
    });

    it("toTrashName with empty string return a valid trash name", () => {
        const trashName = generateTrashName("");
        const trashData = fromTrashName(trashName);
        expect(trashData).to.be.not.null;

        const trashNameFinal = toTrashName(trashData!);
        expect(trashNameFinal).to.equal(trashName);
    });
});
