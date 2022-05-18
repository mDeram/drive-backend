import { v4 as uuid } from "uuid";

export interface TrashData {
    name: string;
    time: string;
    id: string;
}

export const generateTrashName = (name: string) => {
    return name + "." + Date.now() + "." + uuid();
}

export const toTrashName = (data: TrashData) => {
    return data.name + "." + data.time + "." + data.id;
}

export const fromTrashName = (fullname: string): TrashData | null => {
    const data = fullname.split(".");
    if (data.length < 3) return null;

    const id = data.pop()!;
    const time = data.pop()!;
    const name = data.join(".");

    return {
        name,
        time,
        id
    }
}
