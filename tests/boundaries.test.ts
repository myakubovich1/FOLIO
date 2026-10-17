import test from "node:test";
import assert from "node:assert/strict";
import { createApp, hash } from "../server/app.js";
import { demoState } from "../server/workspace.js";
import { assess } from "../server/assessment.js";
test("verified owner identity is separate from demo cookies and other owners", async () => {
  const { app, store, ready } = createApp(":memory:", {
    authEnabled: false,
    authenticate: (req) => {
      const sub = req.get("x-test-identity");
      return sub ? { sub, name: sub } : undefined;
    },
  });
  await ready;
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw Error("port");
  const base = `http://127.0.0.1:${addr.port}/api/`;
  const call = (
    path: string,
    identity?: string,
    method = "GET",
    body?: unknown,
    extra: Record<string, string> = {},
  ) =>
    fetch(base + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(identity ? { "x-test-identity": identity } : {}),
        ...extra,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    assert.equal(
      (await call("owner/start", undefined, "POST", {})).status,
      401,
    );
    await call("owner/start", "alice", "POST", {});
    const owner = `owner:${hash(`${process.env.AUTH0_ISSUER_BASE_URL || "test-issuer"}|alice`)}`;
    await store.mutate(owner, (s) => {
      const fixture = demoState("newcomer");
      Object.assign(s, fixture, {
        mode: "owner",
        connected: true,
        assessment: assess(fixture.borrower, 1),
      });
    });
    const a = await (await call("state", "alice")).json();
    assert.equal(a.borrower.records.length > 0, true);
    const b = await (
      await call(`state?owner=${encodeURIComponent(owner)}`, "bob")
    ).json();
    assert.equal(b.borrower.records.length, 0);
    assert.equal(
      (
        await call("records/newcomer-correction", "bob", "PATCH", {
          category: "transfer",
        })
      ).status,
      404,
    );
    const minted = await (await call("passports", "alice", "POST", {})).json();
    const id = minted.passports[0].id;
    assert.equal(
      (await call("shares", "bob", "POST", { passportId: id })).status,
      404,
    );
    const forged = await call(
      "context",
      "alice",
      "POST",
      { name: "Alice", currency: "USD", incomePattern: "mixed" },
      { origin: "https://evil.example" },
    );
    assert.equal(forged.status, 403);
    await call("data", "alice", "DELETE", { confirm: "DELETE" });
    assert.equal(await store.get(owner), undefined);
  } finally {
    await store.close();
    server.close();
  }
});
