import { ___prod___ } from "../constants";
import formData from "form-data";
import Mailgun from "mailgun.js";
import sendTestMail from "./sendTestEmail";

if (!process.env.FRONT_URL) throw new Error("Missing environment variable FRONT_URL");
if (!process.env.MAILGUN_API_KEY) throw new Error("Missing environment variable MAILGUN_API_KEY");

const DOMAIN = "mderam.com";
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
    key: process.env.MAILGUN_API_KEY,
    username: "mDeram",
    url: "https://api.eu.mailgun.net"
});

export interface Email {
    to: string
    subject: string
    html: string
}

const sendEmail = async (email: Email): Promise<boolean> => {
    if (!___prod___ && email.to.endsWith("@test.com")) return sendTestMail(email);

    try {
        const msg = await mg.messages.create(DOMAIN, {
            from: "Mderam Drive <drive@mderam.com>",
            ...email
        })
        return msg.status === 200;
    } catch(e) {
        console.error("send email", e);
        return false;
    }
}

export const sendRegisterConfirmationEmail = (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/register-confirmation?token=" + token;

    return sendEmail({
        to,
        subject: "Mderam Drive Account Creation",
        html: `
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
    `});
}

export const sendResetPasswordConfirmationEmail = (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/reset-password-confirmation?token=" + token;

    return sendEmail({
        to,
        subject: "Mderam Drive Account Recovery",
        html: `
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
    `});
}

export const sendDeleteUserConfirmationEmail = (name: string, to: string, token: string) => {
    const confirmationUrl = process.env.FRONT_URL + "/delete-user-confirmation?token=" + token;
    //TODO if the user did not make the request, someone logged in their account, implement a way to log out every user
    //logged in this account and also implement a change password feature.

    return sendEmail({
        to,
        subject: "Mderam Drive Account Deletion",
        html: `
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
    `});
}

export default sendEmail;
