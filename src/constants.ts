export const ___prod___ = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = "cloud.qid";

//export const DRIVE_PATH = "/home/matutu/Development/cloud/drive";
if (!process.env.DRIVE_PATH) throw new Error("No data path provided");
export const DRIVE_PATH = process.env.DRIVE_PATH;
export const FILES_DIR= "/files";
export const TRASH_DIR = "/trash";

export const ONE_MONTH_SUBSCRIPTION_AMOUNT = 200;
export const THREE_MONTHS_SUBSCRIPTION_AMOUNT = 200;
