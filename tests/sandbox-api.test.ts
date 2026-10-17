import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
test("public Nessie demo is explicit, synthetic-only, isolated and traced into a passport", async () => {
  const keys = [
    "FOLIO_PUBLIC_SANDBOX",
    "NESSIE_API_KEY",
    "NESSIE_CUSTOMER_ID",
    "NESSIE_BASE_URL",
  ] as const;
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const original = globalThis.fetch;
  Object.assign(process.env, {
    FOLIO_PUBLIC_SANDBOX: "false",
    NESSIE_API_KEY: "unit-test-not-secret",
    NESSIE_CUSTOMER_ID: "synthetic-customer",
    NESSIE_BASE_URL: "https://nessie.unit.test",
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (!url.startsWith("https://nessie.unit.test"))
      return original(input, init);
    const path = new URL(url).pathname;
    const json = path.endsWith("/accounts")
      ? [
          {
            _id: "checking",
            customer_id: "synthetic-customer",
            type: "Checking",
            balance: 1200,
          },
        ]
      : path.endsWith("/deposits")
        ? [
            {
              _id: "deposit",
              amount: 200,
              transaction_date: "2025-01-10",
              status: "completed",
              description: "Synthetic deposit",
            },
          ]
        : path.endsWith("/withdrawals") ||
            path.endsWith("/bills") ||
            path.endsWith("/loans")
          ? []
          : null;
    return new Response(JSON.stringify(json), {
      status: json === null ? 404 : 200,
      headers: { "content-type": "application/json" },
    });
  };
  const { app, store, ready } = createApp(":memory:", { authEnabled: false });
  await ready;
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("port");
  const root = `http://127.0.0.1:${address.port}/api/`;
  const call = (path: string, method = "GET", data?: unknown, cookie = "") =>
    fetch(root + path, {
      method,
      headers: { "content-type": "application/json", cookie },
      body: data ? JSON.stringify(data) : undefined,
    });
  try {
    const session = await call("session", "POST", { profile: "newcomer" });
    const cookie = session.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (await call("nessie/sync", "POST", { consent: true }, cookie)).status,
      403,
    );
    process.env.FOLIO_PUBLIC_SANDBOX = "true";
    const sync = await call("nessie/sync", "POST", { consent: true }, cookie);
    assert.equal(sync.status, 200);
    const result = await sync.json();
    assert.equal(result.state.borrower.sourceKind, "sandbox");
    assert.equal(result.state.borrower.records.length, 1);
    assert.equal(result.state.assessment.score, null);
    assert.equal(result.state.providerSync.nessie.records, 1);
    assert.equal(
      (await call("connect", "POST", { consent: true }, cookie)).status,
      409,
    );
    const id = result.state.borrower.records[0].id;
    const corrected = await (
      await call(
        `records/${encodeURIComponent(id)}`,
        "PATCH",
        { category: "income" },
        cookie,
      )
    ).json();
    assert.equal(corrected.assessment.income, 20000);
    assert.equal(corrected.assessment.score, null);
    const passportState = await (
      await call("passports", "POST", {}, cookie)
    ).json();
    const p = passportState.passports[0];
    assert.equal(p.assessment.income, 20000);
    assert.equal(p.apiProvenance.records, 1);
    assert.equal(p.apiProvenance.provider, "nessie");
    assert.equal(p.borrower, undefined);
    const share = await (
      await call("shares", "POST", { passportId: p.id }, cookie)
    ).json();
    const recipient = await (await call(`shared/${share.token}`)).json();
    assert.equal(recipient.apiProvenance.records, 1);
    assert.equal(recipient.assessment.sourceKind, "sandbox");
    const other = await call("session", "POST", { profile: "newcomer" });
    const otherCookie = other.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (await call(`passports/${p.id}/pdf`, "GET", undefined, otherCookie))
        .status,
      404,
    );
    const form = new FormData();
    form.set("file", new Blob(["private records"]), "private.csv");
    form.set("consent", "true");
    assert.equal(
      (
        await fetch(root + "uploads/preview", {
          method: "POST",
          headers: { cookie },
          body: form,
        })
      ).status,
      403,
    );
  } finally {
    globalThis.fetch = original;
    for (const k of keys) {
      if (previous[k] === undefined) delete process.env[k];
      else process.env[k] = previous[k];
    }
    await store.close();
    server.close();
  }
});
