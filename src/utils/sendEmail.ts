import nodemailer from "nodemailer";
import { ___prod___ } from "../constants";

if (!process.env.FRONT_URL) throw new Error("Missing environment variable FRONT_URL");

const sendEmail = async (to: string, subject: string, html: string) => {
    const test = !___prod___ && to.endsWith("@test.com");

    const transporter = nodemailer.createTransport({
        host: !___prod___ ? "127.0.0.1" : "host.docker.internal",
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
    const confirmationUrl = process.env.FRONT_URL + "/register-confirmation?token=" + token;

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

export const sendResetPasswordConfirmationEmail = async (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/reset-password-confirmation?token=" + token;

    sendEmail(to, "Mderam Drive Account Recovery", `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <b>Hello ${name},</b><br/>
            Almost done! To change your password, click on the link bellow:<br/>
            <br/>
            <b><a href="${confirmationUrl}">${confirmationUrl}</a></b><br/>
            <br/>
            The link is valid for 1 day, after that you will have to reset your password again,
            if you have not made this request you can ignore this message.<br/>
            <br/>
            Thank you,<br/>
            Mderam Drive
        </body>
        </html>
    `);
}

export const sendDeleteUserConfirmationEmail = async (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/delete-user-confirmation?token=" + token;
    //TODO if the user did not make the request, someone logged in their account, implement a way to log out every user
    //logged in this account and also implement a change password feature.

    sendEmail(to, "Mderam Drive Account Deletion", `
        <!DOCTYPE html>
        <html lang="en">
        <body>
            <b>Hello ${name},</b><br/>
            You asked the deletion of your account,<br/>
            your account and any associated data will be deleted,<br/>
            which includes all files currently stored on the drive, your subscription informations and all your personnal data.<br/>
            Note that once deleted an account cannot be refounded for any subscription since the subscription informations are deleted too.<br/>
            To confirm the deletion, click on the link bellow:<br/>
            <br/>
            <b><a href="${confirmationUrl}">${confirmationUrl}</a></b><br/>
            <br/>
            The link is valid for 1 day, after that you will have to ask for your account deletion again,
            if you have not made this request you should change your password as soon as possible,
            someone logged into your account.<br/>
            <br/>
            Thank you,<br/>
            Mderam Drive
        </body>
        </html>
    `);
}

export default sendEmail;
