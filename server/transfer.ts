import type { Pool } from "pg";
import { isDeepStrictEqual } from "node:util";
type Row = Record<string, unknown>;
export type TransferSnapshot = Record<string, Row[]>;
// Fixed schema/identifiers only; values always use parameters.
export const transferTables = {
  folio_owners: "id text,kind text,created_at timestamptz",
  folio_workspaces: "owner text,data jsonb",
  folio_sessions: "hash text,owner text,expires bigint",
  folio_shares:
    "id text,owner text,hash text,snapshot jsonb,expires bigint,revoked integer",
  folio_sources: "owner text,id text,data jsonb",
  folio_assessments: "owner text,revision integer,data jsonb",
  folio_source_registry:
    "owner text,record_id text,record_date date,source_id text",
  folio_transactions:
    "owner text,record_id text,record_date date,amount bigint,currency text,category text,source_id text,status text",
  folio_audit: "id text,owner text,event text,at timestamptz",
  folio_provider_limits:
    "owner text,scope text,window_start bigint,count integer",
} as const;
export const sourceTables = [
  ...Object.keys(transferTables),
  "folio_tombstones",
  "folio_scorecards",
];
export async function transferSnapshot(
  target: Pool,
  snapshot: TransferSnapshot,
) {
  const client = await target.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('folio-database-transfer',0))",
    );
    const existing = new Set(
      (await client.query("SELECT id FROM folio_owners")).rows.map((r) => r.id),
    );
    const deleted = new Set(
      (await client.query("SELECT owner FROM folio_tombstones")).rows.map(
        (r) => r.owner,
      ),
    );
    const sourceDeleted = new Set(
      (snapshot.folio_tombstones || []).map((r) => r.owner),
    );
    for (const owner of sourceDeleted)
      if (existing.has(owner))
        throw Error(
          "Source deletion conflicts with an active destination owner; reconcile before transfer.",
        );
    const accepted = new Set(
      snapshot.folio_owners
        .filter(
          (r) =>
            !existing.has(r.id) &&
            !deleted.has(r.id) &&
            !sourceDeleted.has(r.id),
        )
        .map((r) => r.id),
    );
    const skipped = {
      existingDestination: snapshot.folio_owners.filter((r) =>
        existing.has(r.id),
      ).length,
      destinationDeletionGuard: snapshot.folio_owners.filter((r) =>
        deleted.has(r.id),
      ).length,
      sourceDeletionGuard: snapshot.folio_owners.filter((r) =>
        sourceDeleted.has(r.id),
      ).length,
    };
    const counts: Record<string, number> = {};
    for (const [table, definition] of Object.entries(transferTables)) {
      const columns = definition
        .split(",")
        .map((x) => x.trim().split(" ")[0])
        .join(",");
      const rows = (snapshot[table] || [])
        .filter((r) => accepted.has(table === "folio_owners" ? r.id : r.owner))
        .map((r) => {
          const row = { ...r };
          for (const key of ["data", "snapshot"])
            if (typeof row[key] === "string")
              row[key] = JSON.parse(row[key] as string);
          return row;
        });
      if (rows.length)
        await client.query(
          `INSERT INTO ${table}(${columns}) SELECT ${columns} FROM jsonb_to_recordset($1::jsonb) AS incoming(${definition})`,
          [JSON.stringify(rows)],
        );
      counts[table] = rows.length;
    }
    for (const row of snapshot.folio_tombstones || [])
      await client.query(
        "INSERT INTO folio_tombstones(owner,complete) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [row.owner, row.complete],
      );
    for (const row of snapshot.folio_scorecards || []) {
      const data =
        typeof row.data === "string" ? JSON.parse(row.data) : row.data;
      const old = await client.query(
        "SELECT data FROM folio_scorecards WHERE version=$1",
        [row.version],
      );
      if (old.rows.length && !isDeepStrictEqual(old.rows[0].data, data))
        throw Error(
          "Scorecard version conflicts with destination; transfer rolled back.",
        );
      await client.query(
        "INSERT INTO folio_scorecards(version,data) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [row.version, JSON.stringify(data)],
      );
    }
    await client.query("COMMIT");
    return {
      skipped,
      ownersCopied: accepted.size,
      ownersSkipped: snapshot.folio_owners.length - accepted.size,
      rows: counts,
      previewsCopied: false,
    };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
