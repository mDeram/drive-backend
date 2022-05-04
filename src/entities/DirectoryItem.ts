import { Field, ObjectType } from "type-graphql";

@ObjectType()
export default class DirectoryItem {
    @Field()
    name: string;

    @Field()
    type: "file" | "folder";
}
