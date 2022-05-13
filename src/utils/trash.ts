import { v4 as uuid } from "uuid";

export interface trashData {
    name: string;
    time: string;
    id: string;
}

export const generateTrashName = (name: string) => {
    return name + "." + Date.now() + "." + uuid();
}

export const toTrashName = (data: trashData) => {
    return data.name + "." + data.time + "." + data.id;
}

export const fromTrashName = (name: string): trashData | null => {
    const data = name.match(/(.*)\.(.*)\.(.*)/); // 1 filename, 2 timestamp, 3 uuid
    if (!data || data.length < 4) return null;

    return {
        name: data[1],
        time: data[2],
        id: data[3]
    }
}
