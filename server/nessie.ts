import { z } from "zod";
import { digest, minor } from "./imports.js";
import type { ImportPreview, RecordRow, Category } from "../src/contracts.js";
import { randomUUID } from "node:crypto";
import { ProviderUnavailable } from "./gemini.js";
const accountSchema = z.object({
  _id: z.string(),
  customer_id: z.string(),
  type: z.string(),
  balance: z.union([z.number(), z.string()]),
});
const movement = z
  .object({
    _id: z.string(),
    amount: z.union([z.number(), z.string()]),
    transaction_date: z.string().optional(),
    purchase_date: z.string().optional(),
    payment_date: z.string().optional(),
    creation_date: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    payer_id: z.string().optional(),
    payee_id: z.string().optional(),
    merchant_id: z.string().optional(),
  })
  .passthrough();
export interface NessieOptions {
  key?: string;
  base?: string;
  customer?: string;
  fetcher?: typeof fetch;
}
export class NessieClient {
  private key: string;
  private base: string;
  readonly customer: string;
  private fetcher: typeof fetch;
  constructor(options: NessieOptions = {}) {
    this.key = options.key || process.env.NESSIE_API_KEY || "";
    this.base =
      options.base ||
      process.env.NESSIE_BASE_URL ||
      "https://prod-api.nessieisreal.com";
    this.customer = options.customer || process.env.NESSIE_CUSTOMER_ID || "";
    this.fetcher = options.fetcher || fetch;
    if (!this.key || !this.customer)
      throw new ProviderUnavailable(
        "Nessie is not configured. Add NESSIE_API_KEY, NESSIE_BASE_URL and the dedicated synthetic NESSIE_CUSTOMER_ID.",
      );
    if (!/^https:\/\//.test(this.base) && !options.fetcher)
      throw new ProviderUnavailable("Use an HTTPS Nessie API base URL.");
  }
  async request(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    const url = new URL(path, this.base);
    url.searchParams.set("key", this.key);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.fetcher(url, {
          method,
          headers: { "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });
        if (!response.ok) {
          if (response.status >= 500 && attempt === 0 && method === "GET")
            continue;
          throw new ProviderUnavailable(
            `Nessie request failed (HTTP ${response.status}). Check the service, dedicated customer and API key; no demo records were substituted.`,
          );
        }
        return await response.json();
      } catch (e) {
        if (attempt === 1 || method !== "GET")
          throw e instanceof ProviderUnavailable
            ? e
            : new ProviderUnavailable(
                "Nessie could not be reached. Retry the connection; your saved records are unchanged.",
              );
      }
    }
    throw new ProviderUnavailable("Nessie unavailable");
  }
  async ingest(): Promise<{
    previews: ImportPreview[];
    capabilities: Record<string, string>;
  }> {
    const accounts = z
      .array(accountSchema)
      .parse(
        await this.request(
          `/customers/${encodeURIComponent(this.customer)}/accounts`,
        ),
      );
    if (!accounts.length)
      throw new ProviderUnavailable(
        "The dedicated Nessie customer has no accounts. Run the documented sandbox seed or select an existing synthetic customer.",
      );
    if (accounts.length > 20)
      throw new ProviderUnavailable(
        "This demo supports at most 20 dedicated sandbox accounts. Use a smaller customer.",
      );
    if (accounts.some((a) => a.customer_id !== this.customer))
      throw new ProviderUnavailable(
        "Nessie account ownership did not match the configured synthetic customer.",
      );
    const capabilities: Record<string, string> = { accounts: "available" };
    const previews: ImportPreview[] = [];
    const owned = new Set(accounts.map((a) => a._id));
    const merchants = new Map<string, string>();
    for (const account of accounts) {
      const rows: RecordRow[] = [];
      const messages: string[] = [];
      const feeds = [
        "deposits",
        "withdrawals",
        "bills",
        "loans",
        "purchases",
        "transfers",
      ] as const;
      const results = await Promise.allSettled(
        feeds.map((feed) =>
          this.request(`/accounts/${encodeURIComponent(account._id)}/${feed}`),
        ),
      );
      for (let i = 0; i < feeds.length; i++) {
        const feed = feeds[i],
          result = results[i];
        if (result.status === "rejected") {
          capabilities[feed] = "unavailable / request failed";
          messages.push(
            `${feed} feed was unavailable; coverage is incomplete.`,
          );
          continue;
        }
        capabilities[feed] = "available";
        let raw: unknown[];
        try {
          raw = z.array(z.unknown()).parse(result.value);
        } catch {
          messages.push(`${feed} returned an unexpected schema.`);
          continue;
        }
        for (const item of raw) {
          try {
            let value = item;
            if (feed === "bills") {
              const b = z
                .object({
                  _id: z.string(),
                  payment_amount: z.union([z.number(), z.string()]),
                  payment_date: z.string().optional(),
                  creation_date: z.string().optional(),
                  status: z.string().optional(),
                })
                .passthrough()
                .parse(item);
              value = {
                ...b,
                amount: b.payment_amount,
                transaction_date: b.payment_date || b.creation_date,
              };
            }
            const tx = movement.parse(value);
            if (
              feed === "purchases" &&
              tx.merchant_id &&
              !merchants.has(tx.merchant_id) &&
              merchants.size < 20
            ) {
              try {
                const merchant = z
                  .object({ _id: z.string(), name: z.string() })
                  .parse(
                    await this.request(
                      `/merchants/${encodeURIComponent(tx.merchant_id)}`,
                    ),
                  );
                if (merchant._id !== tx.merchant_id)
                  throw Error("Merchant mismatch");
                merchants.set(tx.merchant_id, merchant.name.slice(0, 120));
                capabilities.merchants = "available for referenced purchases";
              } catch {
                merchants.set(tx.merchant_id, "");
                capabilities.merchants = "unavailable for referenced purchase";
              }
            }
            const date =
              tx.transaction_date ||
              tx.purchase_date ||
              tx.payment_date ||
              tx.creation_date;
            if (
              !date ||
              !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
              !Number.isFinite(Date.parse(date)) ||
              new Date(date).toISOString().slice(0, 10) !== date
            ) {
              messages.push(
                `${feed} included a missing or invalid date; the row needs source correction.`,
              );
              continue;
            }
            const magnitude = minor(String(tx.amount));
            if (magnitude < 0) throw Error("Unexpected signed source amount");
            let amount = magnitude,
              category: Category = "unknown";
            let excludedReason: string | undefined;
            if (feed === "withdrawals") {
              amount = -magnitude;
              category = "unknown";
            }
            if (feed === "purchases") {
              amount = -magnitude;
              category = "expense";
            }
            if (feed === "bills") {
              amount = -magnitude;
              category = "expense";
              excludedReason =
                "Bill evidence only; a matching cash movement is counted separately.";
            }
            if (feed === "loans") {
              category = "borrowing";
              excludedReason =
                "Loan terms are not a cash movement; repayments require source records.";
            }
            if (feed === "transfers") {
              amount = tx.payer_id === account._id ? -magnitude : magnitude;
              category =
                tx.payer_id &&
                tx.payee_id &&
                owned.has(tx.payer_id) &&
                owned.has(tx.payee_id)
                  ? "transfer"
                  : "unknown";
            }
            const status =
              tx.status &&
              ["completed", "executed", "posted"].includes(tx.status)
                ? "posted"
                : "pending";
            rows.push({
              id: `nessie:${feed}:${tx._id}:${digest(account._id).slice(0, 8)}`,
              date,
              amount,
              currency: "USD",
              description:
                feed === "deposits"
                  ? "Sandbox deposit · classify its purpose"
                  : feed === "withdrawals"
                    ? "Sandbox cash withdrawal · subsequent cash use unknown"
                    : feed === "bills"
                      ? "Sandbox bill evidence"
                      : feed === "loans"
                        ? "Sandbox loan terms"
                        : `Sandbox ${feed} movement`,
              originalValues: {
                date,
                amount: String(tx.amount),
                description: tx.description || "",
                status: tx.status || "unknown",
                type: account.type,
                merchant: tx.merchant_id
                  ? merchants.get(tx.merchant_id) || "unavailable"
                  : "",
              },
              category,
              originalCategory: category,
              sourceId: `nessie:${digest(account._id).slice(0, 24)}`,
              sourceLocation: `Nessie ${feed} source ${tx._id}`,
              accountId: `account:${digest(account._id).slice(0, 20)}`,
              status,
              excludedReason,
              recordType:
                feed === "bills"
                  ? "bill"
                  : feed === "withdrawals"
                    ? "withdrawal"
                    : "transaction",
              interpretation: "source-recorded",
            });
          } catch {
            messages.push(
              `${feed} included an unsupported amount or schema; the row was not guessed.`,
            );
          }
        }
      }
      if (rows.length > 5000)
        throw new ProviderUnavailable(
          "This source exceeds the 5,000-row import limit. No partial truncation was saved.",
        );
      const dates = rows.map((r) => r.date).sort();
      const end = dates.length
        ? new Date(Date.parse(dates.at(-1)!) + 86400000)
            .toISOString()
            .slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const source = {
        id: `nessie:${digest(account._id).slice(0, 24)}`,
        kind: "sandbox" as const,
        label: `Nessie banking simulation · ${account.type}`,
        connected: true,
        consentedAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        coverageStart: dates[0] || end,
        coverageEnd: end,
        accountId: `account:${digest(account._id).slice(0, 20)}`,
        complete: false,
        accountType: (/checking/i.test(account.type)
          ? "checking"
          : /savings/i.test(account.type)
            ? "savings"
            : /credit/i.test(account.type)
              ? "credit"
              : "unknown") as "checking" | "savings" | "credit" | "unknown",
        openingBalance: null,
        closingBalance: minor(String(account.balance)),
        minimumBalance: null,
        obligationsDocumented: rows.some((r) => r.recordType === "bill"),
        reconciliation:
          "API records do not establish complete statement coverage or historical balances. Add a complete statement before receiving a scored result.",
      };
      previews.push({
        id: randomUUID(),
        filename: "Nessie sandbox synchronization",
        source,
        rows,
        errors: [],
        duplicates: 0,
        unresolved: rows.filter((r) => r.category === "unknown").length,
        reconciled: false,
        message: [source.reconciliation, ...messages].join(" "),
        createdAt: new Date().toISOString(),
      });
    }
    return { previews, capabilities };
  }
}
