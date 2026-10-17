import { DatabaseSync } from "node:sqlite";
import { type Pool, type PoolClient } from "pg";
import { databasePool } from "./database.js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { State, Passport } from "../src/contracts.js";
import { SCORECARD_CONFIG } from "./workspace.js";
type Row = Record<string, unknown>;
type Query = (sql: string, params?: unknown[]) => Promise<Row[]>;
const parse = <T>(value: unknown): T =>
  typeof value === "string" ? JSON.parse(value) : (value as T);
export class CleanupPendingError extends Error {}
export class Store {
  readonly db: DatabaseSync | null;
  readonly pool: Pool | null;
  private pending: Promise<unknown> = Promise.resolve();
  private cleanupTimer?: ReturnType<typeof setInterval>;
  constructor(path = ":memory:", url?: string) {
    this.pool = url ? databasePool(url) : null;
    this.db = url ? null : new DatabaseSync(path);
  }
  async query(sql: string, params: unknown[] = []): Promise<Row[]> {
    if (this.pool) return (await this.pool.query(sql, params)).rows;
    const ordered: unknown[] = [];
    const mapped = sql.replace(/\$(\d+)/g, (_token, index) => {
      ordered.push(params[Number(index) - 1]);
      return "?";
    });
    const statement = this.db!.prepare(mapped);
    return statement.all(
      ...((ordered.length ? ordered : params) as (string | number | null)[]),
    ) as Row[];
  }
  async init() {
    this.cleanupTimer = setInterval(() => {
      void this.serial(async () => {
        await this.query("DELETE FROM folio_previews WHERE expires<$1", [
          Date.now(),
        ]);
      }).catch(() => {});
    }, 60000);
    this.cleanupTimer.unref();
    if (this.pool) {
      await this.pool.query(readFileSync("migrations/001_tiger.sql", "utf8"));
      const incomplete = await this.query(
        "SELECT owner FROM folio_tombstones WHERE complete=0",
      );
      if (incomplete.length) {
        if (await this.finishDeletionCleanup())
          await this.query(
            "UPDATE folio_tombstones SET complete=1 WHERE complete=0",
          );
      }
      return;
    }
    const upgraded = Boolean(
      this.db!.prepare(
        "SELECT name FROM sqlite_master WHERE name='folio_owners'",
      ).get(),
    );
    this.db!.exec(
      `PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS folio_owners(id TEXT PRIMARY KEY,kind TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS folio_workspaces(owner TEXT PRIMARY KEY REFERENCES folio_owners(id) ON DELETE CASCADE,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS folio_sessions(hash TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS folio_shares(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,hash TEXT UNIQUE NOT NULL,snapshot TEXT NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS folio_source_registry(owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,record_id TEXT NOT NULL,record_date TEXT NOT NULL,source_id TEXT NOT NULL,PRIMARY KEY(owner,record_id)); CREATE TABLE IF NOT EXISTS folio_transactions(owner TEXT NOT NULL,record_id TEXT NOT NULL,record_date TEXT NOT NULL,amount INTEGER NOT NULL,currency TEXT NOT NULL,category TEXT NOT NULL,source_id TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(owner,record_id,record_date)); CREATE TABLE IF NOT EXISTS folio_sources(owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(owner,id)); CREATE TABLE IF NOT EXISTS folio_assessments(owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,revision INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(owner,revision)); CREATE TABLE IF NOT EXISTS folio_scorecards(version TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS folio_audit(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,event TEXT NOT NULL,at TEXT DEFAULT CURRENT_TIMESTAMP);`,
    );
    this.db!.exec(
      "CREATE TABLE IF NOT EXISTS folio_tombstones(owner TEXT PRIMARY KEY,complete INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS folio_previews(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,data TEXT NOT NULL,expires INTEGER NOT NULL)",
    );
    this.db!.exec("UPDATE folio_tombstones SET complete=1 WHERE complete=0");
    this.db!.exec(
      "CREATE TABLE IF NOT EXISTS folio_provider_limits(owner TEXT NOT NULL REFERENCES folio_owners(id) ON DELETE CASCADE,scope TEXT NOT NULL,window_start INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(owner,scope));",
    );
    this.db!.exec(
      "CREATE TABLE IF NOT EXISTS folio_service_limits(scope TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL);",
    );
    // Upgrade the original local synthetic-only prototype without losing its sessions or shares.
    if (
      this.db!.prepare(
        "SELECT name FROM sqlite_master WHERE name='sessions'",
      ).get()
    ) {
      if (!upgraded)
        for (const row of this.db!.prepare(
          "SELECT id,data FROM sessions",
        ).all() as { id: string; data: string }[]) {
          this.db!.prepare(
            "INSERT OR IGNORE INTO folio_owners(id,kind) VALUES (?,'demo')",
          ).run(row.id);
          this.db!.prepare(
            "INSERT OR IGNORE INTO folio_workspaces VALUES (?,?)",
          ).run(row.id, row.data);
          this.db!.prepare(
            "INSERT OR IGNORE INTO folio_sessions VALUES (?,?,?)",
          ).run(row.id, row.id, Date.now() + 7 * 86400000);
        }
      if (
        !upgraded &&
        this.db!.prepare(
          "SELECT name FROM sqlite_master WHERE name='shares'",
        ).get()
      )
        for (const row of this.db!.prepare("SELECT * FROM shares").all() as {
          id: string;
          owner: string;
          hash: string;
          snapshot: string;
          expires: string;
          revoked: number;
        }[])
          this.db!.prepare(
            "INSERT OR IGNORE INTO folio_shares VALUES (?,?,?,?,?,?)",
          ).run(
            row.id,
            row.owner,
            row.hash,
            row.snapshot,
            Date.parse(row.expires),
            row.revoked,
          );
      this.db!.exec("DROP TABLE IF EXISTS shares; DROP TABLE sessions;");
    }
  }
  private serial<T>(run: () => Promise<T>) {
    const result = this.pending.then(run, run);
    this.pending = result.catch(() => {});
    return result;
  }
  async isDeleted(owner: string) {
    return (
      (
        await this.query(
          "SELECT complete FROM folio_tombstones WHERE owner=$1",
          [owner],
        )
      ).length > 0
    );
  }
  private async finishDeletionCleanup(): Promise<boolean> {
    if (!this.pool) return true;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.refreshAggregate();
        return true;
      } catch {
        /* A tombstone continues denying access; never clear it on failed refresh. */
      }
    }
    return false;
  }
  async create(owner: string, state: State, recreate = false) {
    return this.serial(async () => {
      if (recreate && this.pool) {
        const pending = await this.query(
          "SELECT complete FROM folio_tombstones WHERE owner=$1",
          [owner],
        );
        if (pending.length && Number(pending[0].complete) === 0) {
          if (!(await this.finishDeletionCleanup()))
            throw new CleanupPendingError(
              "Your deleted data remains inaccessible. Analytics cleanup is temporarily unavailable; retry a fresh start after the database service recovers.",
            );
          await this.query(
            "UPDATE folio_tombstones SET complete=1 WHERE owner=$1",
            [owner],
          );
        }
      }
      const client = this.pool ? await this.pool.connect() : undefined;
      const q: Query = client
        ? async (sql, p) => (await client.query(sql, p)).rows
        : (sql, p) => this.query(sql, p);
      try {
        await q("BEGIN");
        if (this.pool)
          await q("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
            owner,
          ]);
        const deleted = await q(
          "SELECT complete FROM folio_tombstones WHERE owner=$1",
          [owner],
        );
        if (deleted.length && (!recreate || Number(deleted[0].complete) !== 1))
          throw new Error(
            "Deleted workspace requires an explicit fresh start after cleanup.",
          );
        if (deleted.length)
          await q("DELETE FROM folio_tombstones WHERE owner=$1", [owner]);
        await q(
          "INSERT INTO folio_owners(id,kind) VALUES ($1,$2) ON CONFLICT(id) DO NOTHING",
          [owner, state.mode || "demo"],
        );
        await q(
          "INSERT INTO folio_workspaces(owner,data) VALUES ($1,$2) ON CONFLICT(owner) DO NOTHING",
          [owner, JSON.stringify(state)],
        );
        await q("COMMIT");
      } catch (e) {
        await q("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client?.release();
      }
    });
  }
  async get(owner: string): Promise<State | undefined> {
    const rows = await this.query(
      "SELECT data FROM folio_workspaces WHERE owner=$1",
      [owner],
    );
    return rows[0] ? parse<State>(rows[0].data) : undefined;
  }
  async session(tokenHash: string) {
    const rows = await this.query(
      "SELECT owner FROM folio_sessions WHERE hash=$1 AND expires>$2",
      [tokenHash, Date.now()],
    );
    return rows[0]?.owner as string | undefined;
  }
  async addSession(hash: string, owner: string) {
    await this.query(
      "INSERT INTO folio_sessions(hash,owner,expires) VALUES ($1,$2,$3)",
      [hash, owner, Date.now() + 7 * 86400000],
    );
  }
  async mutate<T>(
    owner: string,
    fn: (s: State, q: Query) => T | Promise<T>,
  ): Promise<{ state: State; value: T }> {
    const run = async () => {
      let client: PoolClient | undefined;
      const q: Query = this.pool
        ? async (sql, params) => (await client!.query(sql, params)).rows
        : (sql, params) => this.query(sql, params);
      try {
        if (this.pool) client = await this.pool.connect();
        await q("BEGIN");
        if (this.pool)
          await q("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
            owner,
          ]);
        const rows = await q(
          `SELECT data FROM folio_workspaces WHERE owner=$1${this.pool ? " FOR UPDATE" : ""}`,
          [owner],
        );
        if (!rows[0]) throw new Error("Workspace unavailable");
        const s = parse<State>(rows[0].data);
        const value = await fn(s, q);
        await this.persist(owner, s, q);
        await q("COMMIT");
        return { state: s, value };
      } catch (e) {
        await q("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client?.release();
      }
    };
    const result = this.pending.then(run, run);
    this.pending = result.catch(() => {});
    return result;
  }
  private async persist(owner: string, s: State, q: Query) {
    await q("UPDATE folio_workspaces SET data=$1 WHERE owner=$2", [
      JSON.stringify(s),
      owner,
    ]);
    await q("DELETE FROM folio_transactions WHERE owner=$1", [owner]);
    await q("DELETE FROM folio_source_registry WHERE owner=$1", [owner]);
    await q("DELETE FROM folio_sources WHERE owner=$1", [owner]);
    if (this.pool) {
      const records = JSON.stringify(
        s.borrower.records.map((r) => ({
          record_id: r.id,
          record_date: r.date,
          amount: r.amount,
          currency: r.currency,
          category: r.category,
          source_id: r.sourceId || "saved-demo",
          status: r.excludedReason ? "excluded" : r.status || "posted",
        })),
      );
      await q(
        "INSERT INTO folio_source_registry(owner,record_id,record_date,source_id) SELECT $1,record_id,record_date,source_id FROM jsonb_to_recordset($2::jsonb) AS x(record_id text,record_date date,source_id text)",
        [owner, records],
      );
      await q(
        "INSERT INTO folio_transactions(owner,record_id,record_date,amount,currency,category,source_id,status) SELECT $1,record_id,record_date,amount,currency,category,source_id,status FROM jsonb_to_recordset($2::jsonb) AS x(record_id text,record_date date,amount bigint,currency text,category text,source_id text,status text)",
        [owner, records],
      );
    } else
      for (const r of s.borrower.records) {
        await q(
          "INSERT INTO folio_source_registry(owner,record_id,record_date,source_id) VALUES ($1,$2,$3,$4)",
          [owner, r.id, r.date, r.sourceId || "saved-demo"],
        );
        await q(
          "INSERT INTO folio_transactions(owner,record_id,record_date,amount,currency,category,source_id,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            owner,
            r.id,
            r.date,
            r.amount,
            r.currency,
            r.category,
            r.sourceId || "saved-demo",
            r.excludedReason ? "excluded" : r.status || "posted",
          ],
        );
      }
    for (const source of s.sources || [])
      await q("INSERT INTO folio_sources(owner,id,data) VALUES ($1,$2,$3)", [
        owner,
        source.id,
        JSON.stringify(source),
      ]);
    if (s.assessment)
      await q(
        "INSERT INTO folio_assessments(owner,revision,data) VALUES ($1,$2,$3) ON CONFLICT(owner,revision) DO NOTHING",
        [owner, s.revision, JSON.stringify(s.assessment)],
      );
    await q(
      "INSERT INTO folio_scorecards(version,data) VALUES ($1,$2) ON CONFLICT(version) DO NOTHING",
      [SCORECARD_CONFIG.version, JSON.stringify(SCORECARD_CONFIG)],
    );
  }
  async share(tokenHash: string): Promise<Passport | undefined> {
    const rows = await this.query(
      "SELECT owner,snapshot FROM folio_shares WHERE hash=$1 AND revoked=0 AND expires>$2",
      [tokenHash, Date.now()],
    );
    if (rows[0])
      await this.query(
        "INSERT INTO folio_audit(id,owner,event) SELECT $1,id,$2 FROM folio_owners WHERE id=$3",
        [randomUUID(), "share-access-permitted", rows[0].owner],
      );
    return rows[0] ? parse<Passport>(rows[0].snapshot) : undefined;
  }
  async audit(owner: string, event: string, q: Query = this.query.bind(this)) {
    await q("INSERT INTO folio_audit(id,owner,event) VALUES ($1,$2,$3)", [
      randomUUID(),
      owner,
      event,
    ]);
  }
  async takeProviderBudget(
    owner: string,
    scope: string,
    limit = 8,
    windowMs = 60000,
  ) {
    return this.serial(async () => {
      const now = Date.now(),
        cutoff = now - windowMs;
      const rows = await this.query(
        "INSERT INTO folio_provider_limits(owner,scope,window_start,count) SELECT id,$2,$3,1 FROM folio_owners WHERE id=$1 ON CONFLICT(owner,scope) DO UPDATE SET count=CASE WHEN folio_provider_limits.window_start<=$4 THEN 1 ELSE folio_provider_limits.count+1 END,window_start=CASE WHEN folio_provider_limits.window_start<=$5 THEN excluded.window_start ELSE folio_provider_limits.window_start END WHERE folio_provider_limits.window_start<=$6 OR folio_provider_limits.count<$7 RETURNING count",
        [owner, scope, now, cutoff, cutoff, cutoff, limit],
      );
      return rows.length > 0;
    });
  }
  async takeServiceBudget(scope: string, limit: number, windowMs = 60000) {
    return this.serial(async () => {
      const now = Date.now(),
        cutoff = now - windowMs;
      const rows = await this.query(
        "INSERT INTO folio_service_limits(scope,window_start,count) VALUES($1,$2,1) ON CONFLICT(scope) DO UPDATE SET count=CASE WHEN folio_service_limits.window_start<=$3 THEN 1 ELSE folio_service_limits.count+1 END,window_start=CASE WHEN folio_service_limits.window_start<=$4 THEN excluded.window_start ELSE folio_service_limits.window_start END WHERE folio_service_limits.window_start<=$5 OR folio_service_limits.count<$6 RETURNING count",
        [scope, now, cutoff, cutoff, cutoff, limit],
      );
      return rows.length > 0;
    });
  }
  // Reserve both allowances in one transaction: a refusal consumes neither.
  async reserveProviderBudgets(
    owner: string,
    provider: string,
    scope: string,
    ownerLimit: number,
    serviceLimit: number,
    windowMs = 60000,
  ) {
    return this.serial(async () => {
      const client = this.pool ? await this.pool.connect() : undefined;
      const q: Query = client
        ? async (sql, p) => (await client.query(sql, p)).rows
        : (sql, p) => this.query(sql, p);
      try {
        await q("BEGIN");
        const now = Date.now(),
          cutoff = now - windowMs;
        const personal = await q(
          "INSERT INTO folio_provider_limits(owner,scope,window_start,count) SELECT id,$2,$3,1 FROM folio_owners WHERE id=$1 ON CONFLICT(owner,scope) DO UPDATE SET count=CASE WHEN folio_provider_limits.window_start<=$4 THEN 1 ELSE folio_provider_limits.count+1 END,window_start=CASE WHEN folio_provider_limits.window_start<=$5 THEN excluded.window_start ELSE folio_provider_limits.window_start END WHERE folio_provider_limits.window_start<=$6 OR folio_provider_limits.count<$7 RETURNING count",
          [owner, provider, now, cutoff, cutoff, cutoff, ownerLimit],
        );
        if (!personal.length) {
          await q("ROLLBACK");
          return false;
        }
        const shared = await q(
          "INSERT INTO folio_service_limits(scope,window_start,count) VALUES($1,$2,1) ON CONFLICT(scope) DO UPDATE SET count=CASE WHEN folio_service_limits.window_start<=$3 THEN 1 ELSE folio_service_limits.count+1 END,window_start=CASE WHEN folio_service_limits.window_start<=$4 THEN excluded.window_start ELSE folio_service_limits.window_start END WHERE folio_service_limits.window_start<=$5 OR folio_service_limits.count<$6 RETURNING count",
          [scope, now, cutoff, cutoff, cutoff, serviceLimit],
        );
        if (!shared.length) {
          await q("ROLLBACK");
          return false;
        }
        await q("COMMIT");
        return true;
      } catch (e) {
        await q("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client?.release();
      }
    });
  }
  async cashflow(owner: string) {
    return this.serial(async () => {
      const state = await this.get(owner);
      if (!state || (await this.isDeleted(owner)))
        return {
          backend: this.pool
            ? "TimescaleDB continuous aggregate"
            : "local SQLite",
          rows: [],
        };
      if (!this.pool) {
        return {
          backend: "local SQLite",
          rows: state.assessment?.monthly || [],
        };
      }
      await this.refresh(owner);
      const rows = await this.query(
        "SELECT to_char(bucket,'YYYY-MM') AS month,sum(income) AS income,sum(spending) AS spending,sum(refunds) AS refunds FROM folio_daily_cashflow WHERE owner=$1 AND currency=$2 AND EXISTS(SELECT 1 FROM folio_workspaces w WHERE w.owner=$1) AND NOT EXISTS(SELECT 1 FROM folio_tombstones t WHERE t.owner=$1) GROUP BY month ORDER BY month",
        [owner, state.borrower.currency],
      );
      const monthly = rows.map((r) => ({
        month: String(r.month),
        income: Number(r.income),
        spending: Number(r.spending),
        refunds: Number(r.refunds),
      }));
      if (
        monthly.some(
          (r) => ![r.income, r.spending, r.refunds].every(Number.isSafeInteger),
        )
      )
        throw new Error("Analytics total exceeds exact-number range");
      return {
        backend: "TimescaleDB continuous aggregate (refreshed + real-time)",
        rows: monthly,
      };
    });
  }

  // Timescale refuses overlapping refreshes even across distinct owners.
  // A session advisory lock serializes CALL across application replicas without
  // wrapping the procedure in a transaction (which Timescale forbids).
  async refreshAggregate(start?: unknown, end?: unknown) {
    if (!this.pool) return;
    const client = await this.pool.connect();
    let locked = false,
      discard = false;
    try {
      await client.query(
        "SELECT pg_advisory_lock(hashtextextended('folio-cagg-refresh',0))",
      );
      locked = true;
      if (start)
        await client.query(
          "CALL refresh_continuous_aggregate('folio_daily_cashflow', $1::date, $2::date + 1)",
          [start, end],
        );
      else
        await client.query(
          "CALL refresh_continuous_aggregate('folio_daily_cashflow', NULL::date, NULL::date)",
        );
    } finally {
      if (locked)
        try {
          await client.query(
            "SELECT pg_advisory_unlock(hashtextextended('folio-cagg-refresh',0))",
          );
        } catch {
          discard = true;
        }
      client.release(discard);
    }
  }
  async refresh(owner: string) {
    if (!this.pool) return;
    const rows = await this.query(
      "SELECT min(record_date) AS start,max(record_date) AS end FROM folio_transactions WHERE owner=$1",
      [owner],
    );
    if (rows[0]?.start) await this.refreshAggregate(rows[0].start, rows[0].end);
  }
  async delete(owner: string) {
    return this.serial(async () => {
      const client = this.pool ? await this.pool.connect() : undefined;
      const q: Query = client
        ? async (sql, p) => (await client.query(sql, p)).rows
        : (sql, p) => this.query(sql, p);
      try {
        await q("BEGIN");
        if (this.pool)
          await q("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
            owner,
          ]);
        await q(
          "INSERT INTO folio_tombstones(owner,complete) VALUES ($1,0) ON CONFLICT(owner) DO UPDATE SET complete=0",
          [owner],
        );
        await q("DELETE FROM folio_transactions WHERE owner=$1", [owner]);
        await q("DELETE FROM folio_owners WHERE id=$1", [owner]);
        await q("COMMIT");
      } catch (e) {
        await q("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client?.release();
      }
      const complete = await this.finishDeletionCleanup();
      if (complete)
        await this.query(
          "UPDATE folio_tombstones SET complete=1 WHERE owner=$1",
          [owner],
        );
      return { cleanupPending: !complete };
    });
  }
  async close() {
    clearInterval(this.cleanupTimer);
    await this.pending;
    this.db?.close();
    await this.pool?.end();
  }
}
