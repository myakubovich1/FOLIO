import { createHash } from "node:crypto";
import type { Store } from "./store.js";
export async function reserveProviderCall(
  store: Store,
  owner: string,
  provider: "nessie" | "gemini",
) {
  const key =
    provider === "nessie"
      ? `${process.env.NESSIE_BASE_URL}|${process.env.NESSIE_API_KEY}`
      : process.env.GEMINI_API_KEY || "unconfigured";
  const scope = `${provider}:${createHash("sha256").update(key).digest("hex")}`;
  return store.reserveProviderBudgets(
    owner,
    provider,
    scope,
    provider === "nessie" ? 4 : 8,
    provider === "nessie" ? 12 : 24,
  );
}
