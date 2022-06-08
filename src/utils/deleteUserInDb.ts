import { getManager } from "typeorm";
import Subscription from "../entities/Subscription";
import User from "../entities/User";

const deleteUserInDb = (id: number) => {
    return getManager().transaction(async transaction => {
        await transaction.delete(Subscription, { userId: id });
        return await transaction.delete(User, id);
    });
}

export default deleteUserInDb;
