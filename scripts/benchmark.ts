import "../server/config.js";
import { performance } from "node:perf_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { demoState } from "../server/workspace.js";
import { profiles } from "../server/seeds.js";
import { assess } from "../server/assessment.js";
const db = process.env.DATABASE_URL || process.env.FOLIO_TEST_DATABASE_URL;
if (!db)
  throw Error(
    "Set DATABASE_URL or FOLIO_TEST_DATABASE_URL for actual Timescale measurements.",
  );
const store = new Store(":memory:", db);
await store.init();
const results = [];
try {
  for (const p of profiles) {
    const owner = `benchmark:${randomUUID()}`;
    const s = demoState(p.id);
    s.connected = true;
    s.assessment = assess(s.borrower, 1);
    try {
      const start = performance.now();
      await store.create(owner, s);
      await store.mutate(owner, () => {});
      const persistMs = performance.now() - start;
      const elapsed = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await store.cashflow(owner);
        elapsed.push(performance.now() - start);
      }
      elapsed.sort((a, b) => a - b);
      results.push({
        profile: p.id,
        records: s.borrower.records.length,
        months: s.borrower.months,
        persistMs,
        reads: 10,
        medianMs: elapsed[5],
        maximumMs: elapsed[9],
      });
    } finally {
      await store.delete(owner);
    }
  }
  mkdirSync("output/verification", { recursive: true });
  writeFileSync(
    "output/verification/query-measurements.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        scope:
          `${["localhost","127.0.0.1"].includes(new URL(db).hostname) ? "Local PostgreSQL/Timescale" : "Configured network Tiger Cloud/PostgreSQL"}; API-equivalent refresh plus monthly aggregate; sequential warm requests; no concurrency/load claim`,
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await store.close();
}
