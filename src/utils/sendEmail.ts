import nodemailer from "nodemailer";
import { ___prod___ } from "../constants";

const sendEmail = async (to: string, subject: string, html: string) => {
    const test = !___prod___ && to.endsWith("@test.com");

    const transporter = nodemailer.createTransport({
        host: "127.0.0.1",
        port: test ? 7777 : 1025,
        secure: false,
        auth: {
            user: test ? undefined : process.env.MAIL_NAME,
            pass: test ? undefined : process.env.MAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const info = await transporter.sendMail({
        from: process.env.MAIL_NAME,
        to,
        subject,
        html
    });

    console.log("Message sent: ", info.messageId);
}

export const sendRegisterConfirmationEmail = async (name: string, to: string, token: string) => {
    const confirmationUrl = "http://localhost:3000/register-confirmation?token=" + token;

    sendEmail(to, "Mderam Drive Account Creation", `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <b>Hello ${name},</b><br/>
            Almost done! To finalize your account click on the link bellow:<br/>
            <br/>
            <b><a href="${confirmationUrl}">${confirmationUrl}</a></b><br/>
            <br/>
            The link is valid for 1 day, after that you will have to register again,
            if you have not made this request you can ignore this message.<br/>
            <br/>
            Thank you,<br/>
            Mderam Drive
        </body>
        </html>
    `);
}

export default sendEmail;
