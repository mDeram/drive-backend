import { SESSION_COOKIE } from "../constants";
import { MyContext } from "../types";

const destroySession = (req: MyContext["req"], res: MyContext["res"]): Promise<boolean> => {
    return new Promise(resolve => req.session.destroy(err => {
        res.clearCookie(SESSION_COOKIE);
        resolve(!err);
    }));
}

export default destroySession;
