import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
export const configuredAuth = () =>
  Boolean(
    process.env.AUTH0_ISSUER_BASE_URL &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.SESSION_SECRET,
  );
export const appUrl = () =>
  process.env.APP_URL ||
  (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3100");
export const providerStatus = () => ({
  auth0: configuredAuth(),
  tiger: Boolean(process.env.DATABASE_URL),
  nessie: Boolean(process.env.NESSIE_API_KEY && process.env.NESSIE_CUSTOMER_ID),
  gemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
});
