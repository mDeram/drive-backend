import { Arg, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root } from "type-graphql";
import User from "../entities/User";
import RegisterInput from "../inputs/RegisterInput";
import { MyContext } from "../types";
import argon2 from "argon2";
import { SESSION_COOKIE } from "../constants";

@Resolver(User)
export default class UserResolver {
    @FieldResolver(() => Int)
    subscriptionSize(@Root() user: User) {
        return user.subscription === "free" ? 200 * 1024 : 0;
    }

    @Query(() => User, { nullable: true })
    user(
        @Ctx() { req }: MyContext
    ): Promise<User> | null {
        if (!req.session.userId) return null;
        return User.findOneOrFail(req.session.userId);
    }

    @Mutation(() => User)
    async register(
        @Arg("inputs") { username, email, password }: RegisterInput,
        @Ctx() { req }: MyContext
    ): Promise<User> {
        const hash = await argon2.hash(password);

        const user = User.create({ username, email, password: hash });
        await user.save();

        req.session.userId = user.id;

        return user;
    }

    @Mutation(() => User, { nullable: true })
    async login(
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Ctx() { req }: MyContext
    ): Promise<User | null> {
        // Wait >= 0.5s and < 0.75s
        // Makes it harder to know if a user has been found
        // Prevents bruteforce attack
        const waitTime = (Math.random() / 4 + 0.5) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));

        const user = await User.findOne({ email });
        if (!user) return null;

        const valid = await argon2.verify(user.password, password);
        if (!valid) return null;

        req.session.userId = user.id;

        return user;
    }

    @Mutation(() => Boolean)
    logout(
        @Ctx() { req, res }: MyContext
    ): Promise<boolean> {
        return new Promise(resolve => req.session.destroy(err => {
            res.clearCookie(SESSION_COOKIE);
            resolve(!err);
        }));
    }
}
