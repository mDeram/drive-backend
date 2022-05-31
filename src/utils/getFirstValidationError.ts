import { Validator } from "./validators";

const getFirstValidationError = (validators: Validator | Validator[] | undefined, value: string): string | null => {
    if (!validators) return null;
    const toValidate = typeof validators === "function" ? [validators] : validators;

    for (let i = 0; i < toValidate.length; i++) {
        const error = toValidate[i](value);
        if (error) return error;
    }

    return null;
}

export default getFirstValidationError;
