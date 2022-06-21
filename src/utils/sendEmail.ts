import axios from "axios";
import { ___prod___ } from "../constants";

if (!process.env.FRONT_URL) throw new Error("Missing environment variable FRONT_URL");
if (!process.env.MAIL_ENDPOINT) throw new Error("Missing environment variable MAIL_ENDPOINT");
const url = process.env.MAIL_ENDPOINT;

const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    const result = await axios.post(url, {
        to,
        subject,
        content: html
    }, {
        headers: {
            "Email-Server-Name": "drive",
            "Email-Server-Secret": process.env.MAIL_SECRET || ""
        },
        validateStatus: () => true
    });

    if (result.status !== 200) {
        console.error("send email", result.status, result.data);
        return false;
    }

    return true;
}

export const sendRegisterConfirmationEmail = (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/register-confirmation?token=" + token;

    return sendEmail(to, "Mderam Drive Account Creation", `
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

export const sendResetPasswordConfirmationEmail = (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/reset-password-confirmation?token=" + token;

    return sendEmail(to, "Mderam Drive Account Recovery", `
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

export const sendDeleteUserConfirmationEmail = (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/delete-user-confirmation?token=" + token;
    //TODO if the user did not make the request, someone logged in their account, implement a way to log out every user
    //logged in this account and also implement a change password feature.

    return sendEmail(to, "Mderam Drive Account Deletion", `
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
