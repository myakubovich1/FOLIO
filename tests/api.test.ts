import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
test("complete journey, immutable snapshot, session isolation, expiry and revocation", async () => {
  const { app, db } = createApp();
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No port");
  const root = `http://127.0.0.1:${address.port}/api/`;
  async function call(
    path: string,
    method = "GET",
    body?: unknown,
    cookie = "",
  ) {
    return fetch(root + path, {
      method,
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  try {
    assert.equal((await call("state")).status, 401);
    const session = await call("session", "POST", { profile: "newcomer" });
    const cookie = session.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (await call("connect", "POST", { consent: false }, cookie)).status,
      400,
    );
    const connected = await (
      await call("connect", "POST", { consent: true }, cookie)
    ).json();
    assert.equal(connected.assessment.score, 71);
    const legacy = structuredClone(connected);
    delete legacy.assessment.monthly;
    db.prepare("UPDATE folio_workspaces SET data=?").run(
      JSON.stringify(legacy),
    );
    assert.ok(
      (await (await call("state", "GET", undefined, cookie)).json()).assessment
        .monthly.length,
    );
    assert.ok(
      (await (await call("cashflow", "GET", undefined, cookie)).json()).rows
        .length,
    );
    const minted = await (await call("passports", "POST", {}, cookie)).json();
    const passport = minted.passports[0];
    assert.equal(passport.assessment.score, 71);
    const ownerPdf = await call(
      `passports/${passport.id}/pdf`,
      "GET",
      undefined,
      cookie,
    );
    assert.equal(ownerPdf.status, 200);
    assert.equal(
      Buffer.from(await ownerPdf.arrayBuffer())
        .subarray(0, 4)
        .toString(),
      "%PDF",
    );
    assert.equal((await call(`passports/${passport.id}/pdf`)).status, 401);
    assert.equal(passport.assessment.factors[0].evidence, undefined);
    const share = await (
      await call("shares", "POST", { passportId: passport.id }, cookie)
    ).json();
    assert.equal((await call(`shared/${share.token}`)).status, 200);
    const shared = await (await call(`shared/${share.token}`)).json();
    assert.equal(shared.borrower, undefined);
    assert.equal(shared.name, undefined);
    assert.equal(shared.assessment.factors[0].evidence, undefined);
    assert.equal(shared.assessment.monthly, undefined);
    assert.equal((await call(`shared/${share.token}/pdf`)).status, 200);
    const sharedResponse = await call(`shared/${share.token}`);
    assert.equal(sharedResponse.headers.get("cache-control"), "no-store");
    assert.equal(sharedResponse.headers.get("referrer-policy"), "no-referrer");
    assert.equal(sharedResponse.headers.get("x-robots-tag"), "noindex");
    await call(
      "records/newcomer-correction",
      "PATCH",
      { category: "transfer" },
      cookie,
    );
    const corrected = await (
      await call("state", "GET", undefined, cookie)
    ).json();
    assert.equal(corrected.revision, 2);
    assert.equal(corrected.passports[0].assessment.revision, 1);
    assert.equal(corrected.assessment.income, 5040000);
    const second = await call("session", "POST", { profile: "merchant" });
    const otherCookie = second.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (
        await call(
          `passports/${passport.id}/pdf`,
          "GET",
          undefined,
          otherCookie,
        )
      ).status,
      404,
    );
    assert.equal(
      (await call("shares", "POST", { passportId: passport.id }, otherCookie))
        .status,
      404,
    );
    assert.equal(
      (
        await call(
          `shares/${share.state.shares[0].id}`,
          "DELETE",
          {},
          otherCookie,
        )
      ).status,
      404,
    );
    await call(`shares/${share.state.shares[0].id}`, "DELETE", {}, cookie);
    assert.equal((await call(`shared/${share.token}`)).status, 410);
    assert.equal((await call(`shared/${share.token}/pdf`)).status, 410);
    const fresh = await (
      await call("shares", "POST", { passportId: passport.id }, cookie)
    ).json();
    db.prepare("UPDATE folio_shares SET expires=?").run(
      Date.parse("2000-01-01T00:00:00Z"),
    );
    assert.equal((await call(`shared/${fresh.token}`)).status, 410);
    assert.equal((await call(`shared/${fresh.token}/pdf`)).status, 410);
  } finally {
    server.close();
    db.close();
  }
});
