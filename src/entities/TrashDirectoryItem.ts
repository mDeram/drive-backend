import { Field, ObjectType } from "type-graphql";
import DirectoryItem from "./DirectoryItem";

@ObjectType()
export default class TrashDirectoryItem extends DirectoryItem {
    @Field()
    id: string;

    @Field()
    time: string;
}
