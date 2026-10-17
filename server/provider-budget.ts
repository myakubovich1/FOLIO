import { createHash } from "node:crypto";
import type { Store } from "./store.js";
export async function reserveProviderCall(
  store: Store,
  owner: string,
  provider: "nessie" | "gemini",
) {
  if (
    !(await store.takeProviderBudget(
      owner,
      provider,
      provider === "nessie" ? 4 : 8,
    ))
  )
    return false;
  const key =
    provider === "nessie"
      ? `${process.env.NESSIE_BASE_URL}|${process.env.NESSIE_API_KEY}`
      : process.env.GEMINI_API_KEY || "unconfigured";
  const scope = `${provider}:${createHash("sha256").update(key).digest("hex")}`;
  return store.takeServiceBudget(scope, provider === "nessie" ? 12 : 24);
}
