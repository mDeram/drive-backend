import { Arg, Mutation } from "type-graphql";
import User from "../entities/User";
import mkDefaultDir from "../utils/mkDefaultDir";
import rmClientDir from "../utils/rmDefaultDir";
import argon2 from "argon2";
import Subscription from "../entities/Subscription";

export default class TestResolver {
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
}
