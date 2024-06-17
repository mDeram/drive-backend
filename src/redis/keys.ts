export const PREFIX = "drive";
export const assemble = (keys: string[]) => keys.join(":");
export const getKey = (key: string) => PREFIX + ":" + key;
export const getPrefix = (key: string) => getKey(key) + ":";

export const getSessionPrefix = () => getPrefix("sess");

export const getDownloadLinkPrefix = () => getPrefix("downloadLink");
export const getDownloadLinkKey = (clientId: string, id: string) => getDownloadLinkPrefix() + assemble([clientId, id]);

export const getRegisterConfirmationPrefix = () => getPrefix("registerConfirmation");
export const getRegisterConfirmationKey = (token: string) => getRegisterConfirmationPrefix() + token;
export const getRegisterConfirmationTimeoutKey = (clientId: string) => getRegisterConfirmationPrefix() + assemble(["timeout", clientId]);

export const getDeleteUserConfirmationPrefix = () => getPrefix("deleteUserConfirmation");
export const getDeleteUserConfirmationKey = (token: string) => getDeleteUserConfirmationPrefix() + token;
export const getDeleteUserConfirmationTimeoutKey = (clientId: string) => getDeleteUserConfirmationPrefix() + assemble(["timeout", clientId]);

export const getResetPasswordConfirmationPrefix = () => getPrefix("resetPasswordConfirmation");
export const getResetPasswordConfirmationKey = (token: string) => getResetPasswordConfirmationPrefix() + token;
export const getResetPasswordConfirmationTimeoutKey = (clientId: string) => getResetPasswordConfirmationPrefix() + assemble(["timeout", clientId]);
