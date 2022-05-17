import { IsEmail, Length, MaxLength } from "class-validator";
import { Field, InputType } from "type-graphql";

@InputType()
export default class RegisterInput {
    @Field()
    @Length(1, 255)
    username: string;

    @Field()
    @IsEmail()
    @MaxLength(255)
    email: string;

    @Field()
    @Length(5, 255)
    password: string;
}
