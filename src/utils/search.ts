import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export const find = async (path: string, pattern: string) => {
    // TODO check regex insertion in find
    const { stdout, stderr } = await execAsync(
        `find "${path}" -iname "*${pattern}*"`
    );

    if (stderr) throw new Error(stderr);
    return stdout;
}

export const grep = async (path: string, pattern: string) => {
    const { stdout, stderr } = await execAsync(
        `grep --recursive --ignore-case --text --only-matching --fixed-string --files-with-matches --exclude="*.png" --exclude="*.gif" --exclude="*.jpg" "${pattern}" "${path}"`
    );

    if (stderr) throw new Error(stderr);
    return stdout;
}

