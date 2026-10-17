import "../server/config.js";
import { DatabaseSync } from "node:sqlite";
import { Store } from "../server/store.js";
import type { State } from "../src/contracts.js";
if (!process.env.DATABASE_URL)
  throw Error("Set DATABASE_URL to the destination first.");
const source = new DatabaseSync(".data/folio.sqlite", { readOnly: true });
const target = new Store(":memory:", process.env.DATABASE_URL);
await target.init();
let copied = 0;
const newlyCopied = new Set<string>();
try {
  for (const row of source
    .prepare("SELECT owner,data FROM folio_workspaces")
    .all() as { owner: string; data: string }[]) {
    if ((await target.get(row.owner)) || (await target.isDeleted(row.owner)))
      continue;
    const state = JSON.parse(row.data) as State;
    await target.create(row.owner, state);
    await target.mutate(row.owner, (s) => Object.assign(s, state));
    copied++;
    newlyCopied.add(row.owner);
  }
  for (const row of source
    .prepare("SELECT hash,owner,expires FROM folio_sessions")
    .all() as { hash: string; owner: string; expires: number }[]) {
    if (newlyCopied.has(row.owner))
      await target.query(
        "INSERT INTO folio_sessions(hash,owner,expires) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [row.hash, row.owner, row.expires],
      );
  }
  for (const row of source
    .prepare("SELECT id,owner,hash,snapshot,expires,revoked FROM folio_shares")
    .all() as {
    id: string;
    owner: string;
    hash: string;
    snapshot: string;
    expires: number;
    revoked: number;
  }[]) {
    if (newlyCopied.has(row.owner))
      await target.query(
        "INSERT INTO folio_shares(id,owner,hash,snapshot,expires,revoked) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
        [row.id, row.owner, row.hash, row.snapshot, row.expires, row.revoked],
      );
  }
  console.log(
    `Copied ${copied} missing workspaces to PostgreSQL; existing destination owners preserved. SQLite source retained unchanged. Expired/unconfirmed upload previews intentionally not copied.`,
  );
} finally {
  source.close();
  await target.close();
}
