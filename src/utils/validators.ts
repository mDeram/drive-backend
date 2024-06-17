import validator from "validator";

export type Validator = (value: string) => string | null;

const validators = {
    username: [
        (value: string) => validator.isLength(value, { min: 1 }) ? null : "Username must be at least 1 character long.",
        (value: string) => validator.isLength(value, { max: 255 }) ? null : "Username must be at most 255 character long."
    ],
    email: [
        (value: string) => validator.isEmail(value) ? null : "Please enter a valid email.",
        (value: string) => validator.isLength(value, { max: 255 }) ? null : "Email must be at most 255 character long."
    ],
    password: [
        (value: string) => validator.isLength(value, { min: 5 }) ? null : "Password must be at least 5 character long.",
        (value: string) => validator.isLength(value, { max: 255 }) ? null : "Password must be at most 255 character long."
    ],
    subject: [
        (value: string) => validator.isLength(value, { min: 1 }) ? null : "Subject must be at least 1 character long."
    ],
    message: [
        (value: string) => validator.isLength(value, { min: 1 }) ? null : "Message must be at least 1 character long."
    ]
}

export default validators
