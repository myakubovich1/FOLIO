import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import {
  transferSnapshot,
  sourceTables,
  type TransferSnapshot,
} from "../server/transfer.js";
import { demoState } from "../server/workspace.js";
import { assess } from "../server/assessment.js";
import { snapshot } from "../server/passports.js";

test(
  "SQLite transfer preserves revisions, passports, sessions and revocation across PostgreSQL restart",
  { skip: !process.env.FOLIO_TEST_DATABASE_URL },
  async () => {
    const source = new Store();
    await source.init();
    let target = new Store(":memory:", process.env.FOLIO_TEST_DATABASE_URL);
    await target.init();
    const owner = `transfer:${randomUUID()}`,
      other = `transfer:${randomUUID()}`,
      session = randomUUID(),
      active = randomUUID(),
      revoked = randomUUID();
    try {
      for (const id of [owner, other]) {
        await source.create(
          id,
          demoState(id === owner ? "newcomer" : "merchant"),
        );
        await source.mutate(id, (s) => {
          s.connected = true;
          s.assessment = assess(s.borrower, s.revision);
          s.passports = [snapshot(s)];
        });
      }
      await source.mutate(owner, (s) => {
        s.borrower.records.at(-1)!.category = "transfer";
        s.revision++;
        s.assessment = assess(s.borrower, s.revision);
        s.passports.push(snapshot(s));
      });
      const state = (await source.get(owner))!;
      await source.addSession(session, owner);
      for (const [hash, isRevoked] of [
        [active, 0],
        [revoked, 1],
      ] as const)
        await source.query(
          "INSERT INTO folio_shares(id,owner,hash,snapshot,expires,revoked) VALUES($1,$2,$3,$4,$5,$6)",
          [
            randomUUID(),
            owner,
            hash,
            JSON.stringify(state.passports[0]),
            Date.now() + 60000,
            isRevoked,
          ],
        );
      const data: TransferSnapshot = {};
      for (const t of sourceTables)
        data[t] = await source.query(`SELECT * FROM ${t}`);
      const result = await transferSnapshot(target.pool!, data);
      assert.equal(result.ownersCopied, 2);
      assert.equal(
        (await transferSnapshot(target.pool!, data)).ownersCopied,
        0,
        "rerun cannot overwrite destination corrections",
      );
      await target.close();
      target = new Store(":memory:", process.env.FOLIO_TEST_DATABASE_URL);
      await target.init();
      assert.deepEqual(await target.get(owner), state);
      assert.equal((await target.get(other))!.borrower.currency, "KES");
      assert.equal(await target.session(session), owner);
      assert.equal(
        (await target.share(active))!.assessment.score,
        71,
        "immutable earlier snapshot survives later correction",
      );
      assert.equal(await target.share(revoked), undefined);
      assert.equal(
        (
          await target.query(
            "SELECT revision FROM folio_assessments WHERE owner=$1 ORDER BY revision",
            [owner],
          )
        ).length,
        2,
      );
      assert.equal(
        (await target.cashflow(owner)).rows.reduce((n, r) => n + r.income, 0),
        5040000,
      );
      assert.equal(
        (await target.cashflow(other)).rows.reduce((n, r) => n + r.income, 0),
        168010000,
      );
      const before = await target.query(
        "SELECT count(*) AS count FROM folio_shares WHERE owner=$1",
        [owner],
      );
      const bad = structuredClone(data);
      bad.folio_owners = bad.folio_owners.map((r) => ({
        ...r,
        id: `new:${r.id}`,
      }));
      bad.folio_scorecards[0].data = { invalid: true };
      await assert.rejects(transferSnapshot(target.pool!, bad));
      assert.deepEqual(
        await target.query(
          "SELECT count(*) AS count FROM folio_shares WHERE owner=$1",
          [owner],
        ),
        before,
      );
    } finally {
      await source.close();
      await target.delete(owner);
      await target.delete(other);
      await target.close();
    }
  },
);
