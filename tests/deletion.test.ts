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

test("SQLite startup recovers an interrupted deletion marker", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "folio-delete-"));
  const path = join(dir, "test.sqlite");
  const first = new Store(path);
  await first.init();
  await first.query(
    "INSERT INTO folio_tombstones(owner,complete) VALUES($1,0)",
    ["interrupted"],
  );
  await first.close();
  const second = new Store(path);
  await second.init();
  try {
    await second.create("interrupted", ownerState(), true);
    assert.ok(await second.get("interrupted"));
  } finally {
    await second.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
