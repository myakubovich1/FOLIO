import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { ownerState } from "../server/workspace.js";
test("deletion serializes with mutations and requires explicit recreation", async () => {
  const s = new Store();
  await s.init();
  await s.create("a", ownerState());
  try {
    const deleted = s.delete("a");
    const mutation = s.mutate("a", (state) => {
      state.borrower.name = "Resurrected";
    });
    await deleted;
    await assert.rejects(mutation, /Workspace unavailable/);
    assert.equal(await s.get("a"), undefined);
    await assert.rejects(s.create("a", ownerState()), /explicit fresh start/);
    await s.create("a", ownerState(), true);
    assert.equal((await s.get("a"))?.borrower.name, "Your profile");
  } finally {
    await s.close();
  }
});
