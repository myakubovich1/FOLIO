import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { demoState } from "../server/workspace.js";
import { reserveProviderCall } from "../server/provider-budget.js";
test("rotating public sessions cannot multiply the shared provider ceiling", async () => {
  const store = new Store();
  await store.init();
  try {
    let accepted = 0;
    for (let i = 0; i < 15; i++) {
      const owner = `demo:${i}`;
      await store.create(owner, demoState("newcomer"));
      if (await reserveProviderCall(store, owner, "nessie")) accepted++;
    }
    assert.equal(accepted, 12);
    const rows = await store.query(
      "SELECT count(*) AS count FROM folio_transactions",
    );
    assert.equal(
      rows[0].count,
      0,
      "budget checks never persist an unconsented demo ledger",
    );
    assert.equal((await store.get("demo:0"))?.revision, 1);
  } finally {
    await store.close();
  }
});

test("SQLite numbered bindings preserve owner and scope when SQL references are reordered or repeated", async () => {
  const store = new Store();
  await store.init();
  try {
    const rows = await store.query(
      "SELECT $2 AS scope,$1 AS owner,$2 AS repeated",
      ["owner-a", "gemini"],
    );
    assert.deepEqual(
      { ...rows[0] },
      { scope: "gemini", owner: "owner-a", repeated: "gemini" },
    );
  } finally {
    await store.close();
  }
});
