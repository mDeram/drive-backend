import { Arg, createUnionType, Ctx, Field, FieldResolver, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import User from "../entities/User";
import RegisterInput from "../inputs/RegisterInput";
import { MyContext } from "../types";
import argon2 from "argon2";
import getSubscriptionSize from "../utils/getSubscriptionSize";
import mkDefaultDir from "../utils/mkDefaultDir";
import rmClientDir from "../utils/rmDefaultDir";
import getFirstValidationError from "../utils/getFirstValidationError";
import validators from "../utils/validators";
import getGenericServerError from "../utils/getGenericServerError";
import { sendDeleteUserConfirmationEmail, sendRegisterConfirmationEmail, sendResetPasswordConfirmationEmail } from "../utils/sendEmail";
import { getDeleteUserConfirmationKey, getDeleteUserConfirmationTimeoutKey, getRegisterConfirmationKey, getRegisterConfirmationTimeoutKey, getResetPasswordConfirmationKey, getResetPasswordConfirmationTimeoutKey } from "../redis/keys";
import isAuth from "../middlewares/isAuth";
import destroySession from "../utils/destroySession";
import deleteUserInDb from "../utils/deleteUserInDb";
import { sendEmailWithTimeout, getDataFromEmailKey } from "../utils/sendEmailHelper";
import { FormError, FormErrors } from "../entities/Errors";

function pushFieldError(errors: FormError[], name: string, value: string) {
    const error = getFirstValidationError((validators as any)[name], value);
    if (!error) return;

    errors.push({
        field: name,
        message: error
    });
}

@ObjectType()
class BooleanResponse {
    @Field()
    response: boolean;

    constructor(response: boolean) {
        this.response = response;
    }
}

const UserFormResponse = createUnionType({
    name: "UserFormResponse",
    types: () => [User, FormErrors] as const
});

const BooleanFormResponse = createUnionType({
    name: "BooleanFormResponse",
    types: () => [BooleanResponse, FormErrors] as const
});

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

        try {
            await user.save();
        } catch(e) { console.error(e) }

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

        //const subscriptions = await Subscription.findOne(user.id);
        return User.findOneOrFail(req.session.userId);
    }

    @Mutation(() => BooleanFormResponse)
    async register(
        @Arg("inputs") { username, email, password }: RegisterInput,
        @Ctx() { redis }: MyContext
    ): Promise<typeof BooleanFormResponse> {
        const errors: FormError[] = [];
        pushFieldError(errors, "username", username);
        pushFieldError(errors, "email", email);
        pushFieldError(errors, "password", password);
        if (errors.length) return new FormErrors(errors);

        const hash = await argon2.hash(password);

        let user;
        try {
            user = await User.create({ username, email, password: hash }).save();
        } catch(e) {
            if (e.code !== '35505' && !e.detail.includes("already exists")) {
                console.error(e);
                return new FormErrors([ getGenericServerError(e) ]);
            }

            user = await User.findOne({ email });
            // User does not exists or exists but is confirmed already
            if (!user || user.confirmed)
                return new FormErrors([{ message: "Email already taken." }]);
        }

        try {
            const error = await sendEmailWithTimeout({
                redis,
                user,
                payload: user.id.toString(),
                getKeyCb:        getRegisterConfirmationKey,
                getTimeoutKeyCb: getRegisterConfirmationTimeoutKey,
                sendEmailCb:    sendRegisterConfirmationEmail
            });
            if (error) return error;
        } catch(e) {
            console.error("register", e);
            return new BooleanResponse(false);
        }

        return new BooleanResponse(true);
    }

    @Mutation(() => UserFormResponse)
    async confirmRegister(
        @Arg("token") token: string,
        @Ctx() { req, redis }: MyContext
    ): Promise<typeof UserFormResponse> {
        const key = getRegisterConfirmationKey(token);
        const [error, user] = await getDataFromEmailKey({ redis, key, parseCb: (data) => [data, null] });
        if (error) return error;

        const clientId = user.id.toString();

        try {
            await mkDefaultDir(clientId);
        } catch(e) {
            console.error(e);

            try {
                await rmClientDir(clientId);
            } catch(e) { console.error(e) }

            return new FormErrors([ getGenericServerError(e) ]);
        }

        user.confirmed = true;
        try {
            await user.save();
        } catch(e) {
            return new FormErrors([ getGenericServerError(e) ]);
        }
        await redis.del(key);

        req.session.userId = user.id;
        req.session.clientId = clientId;

        return user;
    }

    @Mutation(() => BooleanFormResponse)
    async resetPassword(
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Ctx() { redis }: MyContext
    ): Promise<typeof BooleanFormResponse> {
        const errors: FormError[] = [];
        pushFieldError(errors, "email", email);
        pushFieldError(errors, "password", password);
        if (errors.length) return new FormErrors(errors);

        let user;
        try {
            user = await User.findOne({ email });
        } catch(e) {
            return new FormErrors([ getGenericServerError(e) ]);
        }

        if (!user) return new BooleanResponse(true);

        const hash = await argon2.hash(password);
        try {
            const error = await sendEmailWithTimeout({
                redis,
                user,
                payload: JSON.stringify({ id: user.id, hash }),
                getKeyCb:        getResetPasswordConfirmationKey,
                getTimeoutKeyCb: getResetPasswordConfirmationTimeoutKey,
                sendEmailCb:    sendResetPasswordConfirmationEmail
            });
            if (error) return error;
        } catch(e) {
            console.error("reset password", e);
            return new BooleanResponse(false);
        }

        return new BooleanResponse(true);
    }

    @Mutation(() => UserFormResponse)
    async confirmResetPassword(
        @Arg("token") token: string,
        @Ctx() { req, redis }: MyContext
    ): Promise<typeof UserFormResponse> {
        const key = getResetPasswordConfirmationKey(token);
        const [error, user, hash] = await getDataFromEmailKey({ redis, key, parseCb: (value: string) => {
            const parsed = JSON.parse(value);
            return [parsed.id, parsed.hash as string];
        }});
        if (error) return error;

        user.password = hash;

        try {
            await user.save();
        } catch(e) {
            return new FormErrors([ getGenericServerError(e) ]);
        }
        await redis.del(key);

        const clientId = user.id.toString();
        req.session.userId = user.id;
        req.session.clientId = clientId;

        return user;
    }

    @Mutation(() => UserFormResponse)
    async login(
        @Arg("email") email: string,
        @Arg("password") password: string,
        @Ctx() { req }: MyContext
    ): Promise<typeof UserFormResponse> {
        const errors: FormError[] = [];
        pushFieldError(errors, "email", email);
        pushFieldError(errors, "password", password);
        if (errors.length) return new FormErrors(errors);

        // Wait >= 0.5s and < 0.75s
        // Makes it harder to know if a user has been found
        // May prevents some bruteforce attack
        const waitTime = (Math.random() / 4 + 0.5) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));

        let user;
        try {
            user = await User.findOne({ email });
        } catch(e) {
            return new FormErrors([ getGenericServerError(e) ]);
        }

        if (!user) return new FormErrors([{ message: "Wrong email or password." }]);
        //TODO resend code button
        if (!user.confirmed) return new FormErrors([{ message: "Registration not finished, please validate your email first." }]);

        const valid = await argon2.verify(user.password, password);
        if (!valid) return new FormErrors([{ message: "Wrong email or password." }]);

        req.session.userId = user.id;
        req.session.clientId = user.id.toString();

        return user;
    }

    @Mutation(() => Boolean)
    logout(
        @Ctx() { req, res }: MyContext
    ): Promise<boolean> {
        return destroySession(req, res);
    }

    @Mutation(() => BooleanFormResponse)
    @UseMiddleware(isAuth)
    async deleteUser(
        @Arg("password") password: string,
        @Ctx() { req, redis }: MyContext
    ): Promise<typeof BooleanFormResponse> {
        const id = req.session.userId!;

        const user = await User.findOne(id);
        if (!user) return new FormErrors([{ message: "Try logging out and logging back in." }]);

        const valid = await argon2.verify(user.password, password);
        if (!valid) return new FormErrors([{ message: "Wrong password." }]);

        try {
            const error = await sendEmailWithTimeout({
                redis,
                user,
                payload: user.id.toString(),
                getKeyCb:        getDeleteUserConfirmationKey,
                getTimeoutKeyCb: getDeleteUserConfirmationTimeoutKey,
                sendEmailCb:    sendDeleteUserConfirmationEmail
            });
            if (error) return error;
        } catch(e) {
            console.error("deleteUser", e);
            return new FormErrors([{ message: "An error occured, try again later." }]);
        }

        return new BooleanResponse(true);
    }

    @Mutation(() => BooleanFormResponse)
    async confirmDeleteUser(
        @Arg("token") token: string,
        @Ctx() { req, res, redis }: MyContext
    ): Promise<typeof BooleanFormResponse> {
        const key = getDeleteUserConfirmationKey(token);
        const [error, user] = await getDataFromEmailKey({ redis, key, parseCb: (data) => [data, null] });
        if (error) return error;

        const clientId = user.id.toString();

        await deleteUserInDb(user.id);
        await rmClientDir(clientId);

        return new BooleanResponse(await destroySession(req, res));
    }
}
