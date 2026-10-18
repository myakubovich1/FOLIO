import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApp } from "../server/app.js";
import { assess } from "../server/assessment.js";
import { seed } from "../server/seeds.js";
import { sampleCsv, previewCsv, applyImport } from "../server/imports.js";
import { ownerState } from "../server/workspace.js";
import cases from "../evals/cases.json" with { type: "json" };

test("Belarus fixtures, CSV imports and evaluation expectations agree exactly", () => {
  for (const id of ["farmer", "merchant"] as const) {
    const borrower = seed(id);
    const expected = cases.profiles.find((p) => p.id === id)!;
    const a = assess(borrower);
    assert.equal(borrower.currency, "BYN");
    assert.match(borrower.context, /Belarus/);
    assert.equal(a.market?.id, "by-demo");
    assert.equal(a.score, expected.score);
    assert.equal(a.income, expected.income);
    assert.equal(a.expenses, expected.expenses);
    assert.equal(readFileSync(`samples/${id}.csv`, "utf8"), sampleCsv(id));
    const preview = previewCsv(sampleCsv(id), `${id}.csv`);
    assert.deepEqual(preview.errors, []);
    assert.equal(preview.reconciled, true);
    const owner = ownerState();
    owner.borrower.currency = "BYN";
    applyImport(owner, preview);
    assert.equal(owner.borrower.currency, "BYN");
    assert.equal(assess(owner.borrower).score, expected.score);
    const row = borrower.records.find((r) => r.id === `${id}-correction`)!;
    assert.equal(row.amount, 100); // BYN1, expressed as integer minor units.
    row.category = "transfer";
    assert.equal(assess(borrower, 2).income, a.income - 100);
    assert.equal(borrower.currency, "BYN");
  }
});

test("Belarus sessions, passports and sharing keep BYN; retired demos require a fresh start", async () => {
  const { app, store, ready } = createApp();
  await ready;
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("Missing port");
  const root = `http://127.0.0.1:${address.port}/api/`;
  let cookie = "";
  const call = (path: string, method = "GET", body?: unknown) =>
    fetch(root + path, {
      method,
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    const profiles = await (await call("profiles")).json();
    assert.equal(
      profiles.filter((p: { currency: string }) => p.currency === "BYN").length,
      2,
    );
    for (const profile of ["farmer", "merchant"]) {
      const session = await call("session", "POST", { profile });
      cookie = session.headers.get("set-cookie")!.split(";")[0];
      await call("connect", "POST", { consent: true });
      const minted = await (await call("passports", "POST", {})).json();
      const passport = minted.passports[0];
      assert.equal(passport.assessment.currency, "BYN");
      assert.equal(passport.assessment.market.id, "by-demo");
      const shared = await (
        await call("shares", "POST", { passportId: passport.id })
      ).json();
      assert.equal(
        (await (await call(`shared/${shared.token}`)).json()).assessment
          .currency,
        "BYN",
      );
      const pdf = await call(`passports/${passport.id}/pdf`);
      assert.equal(pdf.status, 200);
      assert.equal(
        Buffer.from(await pdf.arrayBuffer())
          .subarray(0, 4)
          .toString(),
        "%PDF",
      );
      const publicSandbox = process.env.FOLIO_PUBLIC_SANDBOX;
      process.env.FOLIO_PUBLIC_SANDBOX = "true";
      try {
        const refused = await call("nessie/sync", "POST", { consent: true });
        assert.equal(refused.status, 400);
        assert.match(
          (await refused.json()).error,
          /USD profile.*Belarusian bank data/,
        );
      } finally {
        if (publicSandbox === undefined)
          delete process.env.FOLIO_PUBLIC_SANDBOX;
        else process.env.FOLIO_PUBLIC_SANDBOX = publicSandbox;
      }
      // Unknown retired demo data is preserved rather than relabelled into a new currency.
      await store.query(
        "UPDATE folio_workspaces SET data=$1 WHERE owner=(SELECT owner FROM folio_shares WHERE id=$2)",
        [
          JSON.stringify({
            ...minted,
            borrower: { ...minted.borrower, currency: "ZZZ" },
          }),
          shared.state.shares[0].id,
        ],
      );
      const retired = await call("state");
      assert.equal(retired.status, 409);
      assert.match(
        (await retired.json()).error,
        /fresh Belarus or United States/,
      );
      assert.deepEqual(
        await (await call(`shared/${shared.token}`)).json(),
        passport,
      );
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await store.close();
  }
});
