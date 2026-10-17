import "../server/config.js";
import { configuredAuth, providerStatus, appUrl } from "../server/config.js";
import { Store } from "../server/store.js";
import { NessieClient } from "../server/nessie.js";
import { GoogleGenAI } from "@google/genai";
import { writeFileSync, mkdirSync } from "node:fs";
const results: Record<string, unknown> = {
  checkedAt: new Date().toISOString(),
  appUrl: appUrl(),
  configured: providerStatus(),
};
if (process.env.DATABASE_URL) {
  const store = new Store(":memory:", process.env.DATABASE_URL);
  try {
    await store.init();
    results.tiger = {
      verified: true,
      extension: await store.query(
        "SELECT extversion FROM pg_extension WHERE extname='timescaledb'",
      ),
    };
  } catch {
    results.tiger = {
      verified: false,
      error:
        "Connection or migration failed. Check DATABASE_URL and extension permissions.",
    };
  } finally {
    await store.close();
  }
} else results.tiger = { verified: false, blocked: "DATABASE_URL is absent" };
if (configuredAuth()) {
  try {
    const issuer = process.env.AUTH0_ISSUER_BASE_URL!.replace(/\/$/, "");
    const r = await fetch(`${issuer}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json();
    results.auth0 = {
      discoveryVerified: r.ok && data.issuer?.replace(/\/$/, "") === issuer,
      loginCallbackVerified: false,
      note: "Discovery does not verify a complete browser login/callback.",
    };
  } catch {
    results.auth0 = {
      discoveryVerified: false,
      error: "Issuer discovery failed",
    };
  }
} else
  results.auth0 = {
    loginCallbackVerified: false,
    blocked:
      "AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET and SESSION_SECRET are required",
  };
if (process.env.NESSIE_API_KEY && process.env.NESSIE_CUSTOMER_ID) {
  try {
    const r = await new NessieClient().ingest();
    results.nessie = {
      verified: true,
      accounts: r.previews.length,
      records: r.previews.reduce((n, p) => n + p.rows.length, 0),
      capabilities: r.capabilities,
      source:
        "Banking simulation only; full statement coverage is not established by the API.",
    };
  } catch {
    results.nessie = {
      verified: false,
      error:
        "Live sandbox request failed. Check key, customer, service base and provider status.",
    };
  }
} else
  results.nessie = {
    verified: false,
    blocked: "NESSIE_API_KEY and NESSIE_CUSTOMER_ID are absent",
  };
if (process.env.GEMINI_API_KEY) {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 15000 },
    });
    const pager = await ai.models.list({ config: { pageSize: 100 } });
    const names: string[] = [];
    for await (const m of pager) if (m.name) names.push(m.name);
    const model = process.env.GEMINI_MODEL;
    results.gemini = {
      modelsListed: true,
      configuredModel: model || null,
      modelAvailable: model
        ? names.some((n) => n === model || n === `models/${model}`)
        : false,
      availableModels: names,
      extractionAndExplanationVerified: false,
      note: "Model discovery alone is not generation. providers:smoke verifies actual explanation and PDF calls.",
    };
  } catch {
    results.gemini = {
      modelsListed: false,
      error:
        "Model discovery failed. Check the key, quota and provider access.",
    };
  }
} else
  results.gemini = {
    modelsListed: false,
    blocked: "GEMINI_API_KEY and GEMINI_MODEL are absent",
  };
mkdirSync("output/verification", { recursive: true });
writeFileSync(
  "output/verification/provider-status.json",
  JSON.stringify(results, null, 2) + "\n",
);
console.log(JSON.stringify(results, null, 2));
