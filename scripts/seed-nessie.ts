import "../server/config.js";
import { NessieClient } from "../server/nessie.js";
import { z } from "zod";
// No writes on ordinary invocation. Use only a dedicated synthetic customer.
if (!process.argv.includes("--apply")) {
  console.log(
    "Plan: find/create FOLIO synthetic checking v1 for NESSIE_CUSTOMER_ID; add three dated synthetic deposits and three withdrawals only when their stable descriptions are absent. Run nessie:seed -- --apply to write sandbox resources. Never use a real customer.",
  );
  process.exit(0);
}
const api = new NessieClient();
const path = `/customers/${encodeURIComponent(api.customer)}/accounts`;
const accounts = z.array(
  z.object({ _id: z.string(), nickname: z.string().optional() }),
);
let list = accounts.parse(await api.request(path));
const nickname = "FOLIO synthetic checking v1";
if (!list.some((a) => a.nickname === nickname)) {
  await api.request(path, "POST", {
    type: "Checking",
    nickname,
    rewards: 0,
    balance: 10000,
  });
  list = accounts.parse(await api.request(path));
}
const account = list.find((a) => a.nickname === nickname);
if (!account)
  throw Error(
    "Created account is not visible. Retry after checking provider; no blind write retries.",
  );
const feed = `/accounts/${encodeURIComponent(account._id)}/deposits`;
const prior = z
  .array(z.object({ description: z.string().optional() }))
  .parse(await api.request(feed));
let created = 0;
for (const [month, amount] of [
  ["01", 4200],
  ["02", 3800],
  ["03", 4600],
] as const) {
  const description = `FOLIO-SEED-v1-2025-${month}-synthetic-client-payment`;
  if (prior.some((x) => x.description === description)) continue;
  await api.request(feed, "POST", {
    medium: "balance",
    transaction_date: `2025-${month}-10`,
    status: "completed",
    amount,
    description,
  });
  created++;
}
const withdrawals = `/accounts/${encodeURIComponent(account._id)}/withdrawals`;
const previousWithdrawals = z
  .array(z.object({ description: z.string().optional() }))
  .parse(await api.request(withdrawals));
let spendingCreated = 0;
for (const [month, amount] of [
  ["01", 2200],
  ["02", 2400],
  ["03", 2100],
] as const) {
  const description = `FOLIO-SEED-v1-2025-${month}-synthetic-household-withdrawal`;
  if (previousWithdrawals.some((r) => r.description === description)) continue;
  await api.request(withdrawals, "POST", {
    medium: "balance",
    transaction_date: `2025-${month}-15`,
    status: "completed",
    amount,
    description,
  });
  spendingCreated++;
}
console.log(
  `Nessie synthetic seed complete: ${created} new deposits, ${spendingCreated} new withdrawals. Existing markers skipped. API deposits still require purpose review and complete statement/balance evidence; this seed alone must remain unscored.`,
);
