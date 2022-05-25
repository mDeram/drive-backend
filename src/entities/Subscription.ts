import { Field, ObjectType } from "type-graphql";
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import User from "./User";

@ObjectType()
@Entity()
export default class Subscription extends BaseEntity {
    @Field()
    @PrimaryColumn()
    id: string;

    @Field()
    @Column()
    userId: number

    @ManyToOne(() => User, user => user.subscriptions)
    user: User;

    @Field()
    @Column()
    type: string; // premium

    @Field()
    @Column({ type: "timestamp" })
    from: Date;

    @Field()
    @Column({ type: "timestamp" })
    to: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
