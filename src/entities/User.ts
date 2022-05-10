import { Field, ObjectType } from "type-graphql";

@ObjectType()
export default class User {
    @Field()
    name: string;

    @Field()
    subscription: string;

    @Field()
    email: string;
}
