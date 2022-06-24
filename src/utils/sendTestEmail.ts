import nodemailer from "nodemailer";
import { Email } from "./sendEmail";

const sendTestMail = async (email: Email): Promise<boolean> => {
    const test = true;

    const transporter = nodemailer.createTransport({
        host: "127.0.0.1",
        port: test ? 7777 : 1025,
        secure: false,
        auth: {
            user: test ? undefined : process.env.MAIL_USER,
            pass: test ? undefined : process.env.MAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        const info = await transporter.sendMail(email);
        console.log("Message sent: %s", info.messageId);
        return true;
    } catch(e) {
        console.error("send test email", e);
        return false;
    }
}

export default sendTestMail;
