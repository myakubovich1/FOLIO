import "../server/config.js";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { Store } from "../server/store.js";
import {
  sourceTables,
  transferSnapshot,
  type TransferSnapshot,
} from "../server/transfer.js";
import { mkdirSync, writeFileSync } from "node:fs";
const targetUrl = process.env.DATABASE_URL;
if (!targetUrl) throw Error("DATABASE_URL is required for the destination.");
const sourceUrl = process.env.FOLIO_SOURCE_DATABASE_URL;
const target = new Store(":memory:", targetUrl);
let sourcePool: Pool | undefined;
let sqlite: DatabaseSync | undefined;
try {
  await target.init();
  const snapshot: TransferSnapshot = {};
  if (sourceUrl) {
    sourcePool = new Pool({
      connectionString: sourceUrl,
      max: 1,
      connectionTimeoutMillis: 10000,
    });
    const source = await sourcePool.connect();
    try {
      await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const identity =
        "SELECT current_database() AS name,inet_server_addr()::text AS address,inet_server_port() AS port";
      const a = (await source.query(identity)).rows[0],
        b = (await target.query(identity))[0];
      if (JSON.stringify(a) === JSON.stringify(b))
        throw Error("Source and destination are the same database.");
      for (const table of sourceTables)
        snapshot[table] = (await source.query(`SELECT * FROM ${table}`)).rows;
      await source.query("COMMIT");
    } catch (e) {
      await source.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      source.release();
    }
  } else {
    sqlite = new DatabaseSync(
      process.env.FOLIO_SOURCE_SQLITE_PATH || ".data/folio.sqlite",
      { readOnly: true },
    );
    sqlite.exec("BEGIN");
    for (const table of sourceTables)
      snapshot[table] = sqlite.prepare(`SELECT * FROM ${table}`).all();
    sqlite.exec("COMMIT");
  }
  // Stop the source app before cutover; this is a consistent copy, not dual-write replication.
  const result = await transferSnapshot(target.pool!, snapshot);
  const evidence = {
    at: new Date().toISOString(),
    source: sourceUrl ? "PostgreSQL" : "SQLite",
    destination: "PostgreSQL/Timescale",
    ...result,
    note: "Source untouched; existing destination owners/deletions preserved. Unconfirmed upload previews excluded. No credentials or owner IDs in this report.",
  };
  mkdirSync("output/verification", { recursive: true });
  writeFileSync(
    "output/verification/database-transfer.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
} catch {
  console.error(
    "Database transfer failed and destination copy transaction was rolled back. Source remains unchanged. Check TLS/connectivity, schema compatibility and conflicting destination owners. No credentials were logged.",
  );
  process.exitCode = 1;
} finally {
  sqlite?.close();
  await sourcePool?.end();
  await target.close();
}
