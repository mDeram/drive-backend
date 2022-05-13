import { Field, ObjectType } from "type-graphql";
import DirectoryItem from "./DirectoryItem";

@ObjectType()
export default class SearchDirectoryItem extends DirectoryItem {
    @Field()
    path: string;
}
