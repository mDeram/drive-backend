import { Arg, Ctx, FieldResolver, Int, Mutation, Query, Resolver, Root } from "type-graphql";
import User from "../entities/User";
import RegisterInput from "../inputs/RegisterInput";
import { MyContext } from "../types";
import argon2 from "argon2";
import { FILES_DIR, SESSION_COOKIE, TRASH_DIR } from "../constants";
import SafePath from "../utils/SafePath";
import { promises as fs } from "fs";
import Subscription from "../entities/Subscription";
import getSubscriptionSize from "../utils/getSubscriptionSize";

@Resolver(User)
export default class UserResolver {
    @FieldResolver()
    async currentSubscription(
        @Root() user: User,
        @Ctx() { orm }: MyContext
    ) {
        const now = new Date();
        const userWithSubscription = await orm
            .getRepository("user")
            .createQueryBuilder("user")
            .leftJoinAndSelect("user.subscriptions", "subscription")
            .where("user.id = :id", { id: user.id })
            .andWhere("subscription.from <= :date", { date: now })
            .andWhere("subscription.to >= :date", { date: now })
            .getOne() as User || undefined; // Only one subscription tier so we don't care getting the best one


        if (!userWithSubscription) {
            user.currentSubscription = "free";
        } else {
            const subscription = userWithSubscription.subscriptions[0];
            user.currentSubscription = subscription.type;
        }

        user.save();

        return user.currentSubscription;
    }

    @FieldResolver(() => Int)
    subscriptionSize(@Root() user: User) {
        return getSubscriptionSize(user.currentSubscription);
    }

    @Query(() => User, { nullable: true })
    async user(
        @Ctx() { req }: MyContext
    ): Promise<User | null> {
        if (!req.session.userId) return null;

        const user = await User.findOneOrFail(req.session.userId);

        //const subscriptions = await Subscription.findOne(user.id);

        return user;
    }

    @Mutation(() => User)
    async register(
        @Arg("inputs") { username, email, password }: RegisterInput,
        @Ctx() { req }: MyContext
    ): Promise<User> {
        const hash = await argon2.hash(password);

        const user = User.create({ username, email, password: hash });
        await user.save();

        const clientId = user.id.toString();

        //TODO hide those errors
        const sp = new SafePath(clientId, "/");
        await fs.mkdir(sp.getServerPath());
        sp.setOrThrow(FILES_DIR);
        await fs.mkdir(sp.getServerPath());
        sp.setOrThrow(TRASH_DIR);
        await fs.mkdir(sp.getServerPath());

        req.session.userId = user.id;
        req.session.clientId = clientId;

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
        req.session.clientId = user.id.toString();

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
