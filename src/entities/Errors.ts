import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class FormError {
    @Field({ nullable: true })
    field?: string;

    @Field()
    message: string;
}

@ObjectType()
export class FormErrors {
    @Field(() => [FormError])
    errors: FormError[];

    constructor(errors: FormError[]) {
        this.errors = errors;
    }
}
