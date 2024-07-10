import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export const find = async (path: string, pattern: string): Promise<string[]> => {
    try {
        const { stdout } = await execAsync(
            `find "${path}" -iname "*${pattern}*"`
        );

        return stdout.split("\n").filter(item => item !== "");
    } catch (err) {}

    return [];
}

export const grep = async (path: string, pattern: string): Promise<string[]> => {
    try {
        const { stdout } = await execAsync(
            `grep --recursive --ignore-case --text --only-matching --fixed-string --files-with-matches --exclude="*.png" --exclude="*.gif" --exclude="*.jpg" "${pattern}" "${path}"`
        );

        return stdout.split("\n").filter(item => item !== "");
    } catch (err) {}

    return [];
}
