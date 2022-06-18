import { Redis } from "ioredis";
import User from "../entities/User";
import { v4 as uuid } from "uuid";
import { FormErrors } from "../entities/Errors";
import getGenericServerError from "./getGenericServerError";

interface sendEmailWithTimeoutProps {
    redis: Redis;
    user: User;
    payload: string;
    getKeyCb: (token: string) => string;
    getTimeoutKeyCb: (userId: string) => string;
    sendEmailCb: (name: string, to: string, token: string) => Promise<void>;
}

export const sendEmailWithTimeout = async ({
    redis,
    user,
    payload,
    getKeyCb,
    getTimeoutKeyCb,
    sendEmailCb
}: sendEmailWithTimeoutProps): Promise<FormErrors | false> => {
    const token = uuid();
    const oneDayInMs = 1000 * 3600 * 24;
    const tenMinutesInMs = 1000 * 60 * 10;
    const key = getKeyCb(token);
    const userId = user.id.toString();

    const timeoutKey = getTimeoutKeyCb(userId);
    if (await redis.get(timeoutKey))
        return new FormErrors([{ message: "We just sent you a message, try again later" }]);

    await redis.set(timeoutKey, key, "ex", tenMinutesInMs)
    await redis.set(key, payload, "ex", oneDayInMs);
    await sendEmailCb(user.username, user.email, token);
    return false;
}

interface getDataFromEmailKeyProps<T> {
    redis: Redis;
    key: string;
    parseCb: (data: string) => [string, T];
}

export const getDataFromEmailKey = async <T = null>({
    redis,
    key,
    parseCb
}: getDataFromEmailKeyProps<T>): Promise<[FormErrors, null] | [false, User, T]> => {
    try {
        const data = await redis.get(key);
        if (!data) return [new FormErrors([{ field: "token", message: "Token expired" }]), null];

        const [userId, otherData] = parseCb(data)
        const user = await User.findOne(userId);
        if (!user) return [new FormErrors([{ field: "token", message: "User no longer exists" }]), null];

        return [false, user, otherData];
    } catch(e) {
        return [new FormErrors([ getGenericServerError(e) ]), null];
    }
}
