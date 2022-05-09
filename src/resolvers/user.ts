import { FieldResolver, Int, Query, Resolver, Root } from "type-graphql";
import User from "../entities/User";

@Resolver(() => User)
export default class UserResolver {
    @FieldResolver(() => Int)
    subscriptionSize(@Root() user: User) {
        return user.subscription === "free" ? 200 * 1024 : 0;
    }

    @Query(() => User)
    user() {
        const user = new User();
        user.subscription = "free";
        user.name = "Mathurin Deramecourt";
        return user;
    }
}
