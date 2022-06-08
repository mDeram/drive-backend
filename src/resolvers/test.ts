import { Arg, Ctx, Mutation } from "type-graphql";
import User from "../entities/User";
import mkDefaultDir from "../utils/mkDefaultDir";
import rmClientDir from "../utils/rmDefaultDir";
import argon2 from "argon2";
import Subscription from "../entities/Subscription";
import { MyContext } from "../types";
import destroySession from "../utils/destroySession";
import deleteUserInDb from "../utils/deleteUserInDb";
import RegisterInput from "../inputs/RegisterInput";

export default class TestResolver {
    @Mutation(() => Boolean)
    async newUser(
        @Arg("inputs") { username, email, password }: RegisterInput,
        @Ctx() { req }: MyContext
    ): Promise<boolean> {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const clientId = existingUser.id.toString();

            await deleteUserInDb(existingUser.id);
            await rmClientDir(clientId);
        }

        const hash = await argon2.hash(password);

        let user;
        try {
            user = await User.create({ username, email, password: hash, confirmed: true }).save();
        } catch(e) {
            if (e.code !== '35505' && !e.detail.includes("already exists")) {
                console.error(e);
            }
            return false;
        }

        const clientId = user.id.toString();

        try {
            await mkDefaultDir(clientId);
        } catch(e) {
            try {
                await rmClientDir(clientId);
            } catch(e) { console.error(e) }

            return false;
        }

        req.session.userId = user.id;
        req.session.clientId = clientId;

        return true;
    }

    @Mutation(() => Boolean)
    async resetUser(
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Arg("subscription", { defaultValue: false }) subscription: boolean
    ): Promise<boolean> {
        const user = await User.findOne({ email });
        if (!user) return false;

        const valid = await argon2.verify(user.password, password);
        if (!valid) return false;

        const { id } = user;
        const clientId = id.toString();

        if (subscription)
            Subscription.delete({ userId: id });

        await rmClientDir(clientId);
        await mkDefaultDir(clientId);

        return true;
    }

    @Mutation(() => Boolean)
    async destroyUser(
        @Arg("email") email: string,
        @Ctx() { req, res }: MyContext
    ): Promise<boolean> {
        const user = await User.findOne({ email });
        if (!user) return false;

        const clientId = user.id.toString();

        await deleteUserInDb(user.id);
        await rmClientDir(clientId);

        return destroySession(req, res);
    }
}
