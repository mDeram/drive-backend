import { Request, Response } from "express";
import { Session } from "express-session";
import { Connection } from "typeorm";

export type RequestSession = Request & { session?: Session & { userId?: number, clientId?: string }};

export type MyContext = {
    req: RequestSession;
    res: Response;
    orm: Connection;
}
