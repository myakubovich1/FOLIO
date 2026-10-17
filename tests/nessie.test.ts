import test from "node:test";
import assert from "node:assert/strict";
import { NessieClient } from "../server/nessie.js";
test("Nessie uses dedicated customer scope, records missing feeds and abstains on ambiguous cash movements", async () => {
  const paths: string[] = [];
  const fake: typeof fetch = async (input) => {
    const url = new URL(String(input));
    paths.push(url.pathname);
    assert.equal(url.searchParams.get("key"), "synthetic-test-key");
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/customers/customer/accounts")
      body = [
        {
          _id: "account-a",
          customer_id: "customer",
          type: "Checking",
          balance: 1000,
        },
      ];
    else if (url.pathname.endsWith("/deposits"))
      body = [
        {
          _id: "deposit-a",
          amount: 125.05,
          transaction_date: "2025-01-10",
          status: "completed",
          description: "Possible income, not proven",
        },
      ];
    else if (url.pathname.endsWith("/withdrawals"))
      body = [
        {
          _id: "withdrawal-a",
          amount: 20,
          transaction_date: "2025-01-12",
          status: "completed",
        },
      ];
    else if (
      url.pathname.endsWith("/purchases") ||
      url.pathname.endsWith("/transfers")
    ) {
      status = 404;
      body = { message: "Unavailable in this API schema" };
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  const result = await new NessieClient({
    key: "synthetic-test-key",
    customer: "customer",
    base: "https://nessie.test",
    fetcher: fake,
  }).ingest();
  assert.equal(paths[0], "/customers/customer/accounts");
  assert.equal(result.previews[0].source.kind, "sandbox");
  assert.equal(result.previews[0].source.complete, false);
  assert.equal(
    result.previews[0].rows.find((r) => r.amount === 12505)?.category,
    "unknown",
  );
  assert.equal(
    result.previews[0].rows.find((r) => r.amount === -2000)?.category,
    "unknown",
  );
  assert.match(result.capabilities.purchases, /unavailable/);
});
test("Nessie rejects accounts outside the configured customer and never substitutes fixtures", async () => {
  const fake: typeof fetch = async () =>
    new Response(
      JSON.stringify([
        {
          _id: "other",
          customer_id: "not-owned",
          type: "Checking",
          balance: 100,
        },
      ]),
      { status: 200 },
    );
  await assert.rejects(
    new NessieClient({
      key: "k",
      customer: "customer",
      base: "https://nessie.test",
      fetcher: fake,
    }).ingest(),
    /ownership/,
  );
});
