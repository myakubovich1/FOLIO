import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { sampleCsv } from "../server/imports.js";
test("private upload previews, imports, assessment and PDFs remain owner-scoped", async () => {
  const { app, store, ready } = createApp(":memory:", {
    authEnabled: false,
    authenticate: (req) => {
      const sub = req.get("x-test-owner");
      return sub ? { sub } : undefined;
    },
  });
  await ready;
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw Error("port");
  const base = `http://127.0.0.1:${addr.port}/api/`;
  const headers = (owner: string) => ({ "x-test-owner": owner });
  const call = (path: string, owner: string, method = "GET", data?: unknown) =>
    fetch(base + path, {
      method,
      headers: { ...headers(owner), "content-type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
  try {
    await call("owner/start", "a", "POST", {});
    const form = new FormData();
    form.append("consent", "true");
    form.append(
      "file",
      new Blob(
        [sampleCsv().replace("External earnings", "Private owner earnings")],
        { type: "text/csv" },
      ),
      "private.csv",
    );
    const preview = await (
      await fetch(base + "uploads/preview", {
        method: "POST",
        headers: headers("a"),
        body: form,
      })
    ).json();
    assert.ok(preview.id);
    assert.equal((await call(`uploads/${preview.id}`, "b")).status, 404);
    assert.equal(
      (
        await call(`uploads/${preview.id}/commit`, "b", "POST", {
          confirm: true,
        })
      ).status,
      404,
    );
    const imported = await (
      await call(`uploads/${preview.id}/commit`, "a", "POST", { confirm: true })
    ).json();
    assert.equal(imported.state.assessment.income, 5050000);
    assert.equal(imported.state.assessment.sourceKind, "uploaded");
    assert.equal(
      (await (await call("state", "b")).json()).borrower.records.length,
      0,
    );
    const issued = await (
      await call("passports", "a", "POST", {
        disclosure: { factors: false, cashflow: false },
        expectedRevision: imported.state.revision,
      })
    ).json();
    const passport = issued.passports[0];
    assert.equal(passport.assessment.income, undefined);
    assert.deepEqual(passport.assessment.factors, []);
    assert.equal((await call(`passports/${passport.id}/pdf`, "b")).status, 404);
    const share = await (
      await call("shares", "a", "POST", { passportId: passport.id })
    ).json();
    assert.equal((await fetch(base + `shared/${share.token}/pdf`)).status, 200);
    await call("data", "a", "DELETE", { confirm: "DELETE" });
    assert.equal((await fetch(base + `shared/${share.token}`)).status, 410);
    assert.equal((await fetch(base + `shared/${share.token}/pdf`)).status, 410);
    assert.equal((await call(`uploads/${preview.id}`, "a")).status, 401);
  } finally {
    server.close();
    await store.close();
  }
});
