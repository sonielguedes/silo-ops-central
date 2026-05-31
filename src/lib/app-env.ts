export const APP_ENV = (process.env.NEXT_PUBLIC_APP_ENV || "prod").toLowerCase();
export const IS_DEMO = APP_ENV === "demo";
export const IS_PROD = APP_ENV === "prod" || APP_ENV === "production";
export const IS_LOCAL = APP_ENV === "local";
