import { Field, ObjectType } from "type-graphql";
import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import Subscription from "./Subscription";

@ObjectType()
@Entity()
export default class User extends BaseEntity {
    @Field()
    @PrimaryGeneratedColumn()
    id: number;

    @Field()
    @Column()
    username: string;

    @Field()
    @Column({ default: "free" })
    currentSubscription: string;

    @OneToMany(() => Subscription, subscription => subscription.user)
    subscriptions: Subscription[];

    @Field()
    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({ default: false })
    confirmed: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
