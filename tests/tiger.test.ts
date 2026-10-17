import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { demoState } from "../server/workspace.js";
import { assess } from "../server/assessment.js";
test(
  "Timescale continuous aggregate refresh, owner filtering and deletion",
  { skip: !process.env.FOLIO_TEST_DATABASE_URL },
  async () => {
    const store = new Store(":memory:", process.env.FOLIO_TEST_DATABASE_URL);
    await store.init();
    const owner = `test:${randomUUID()}`;
    const other = `test:${randomUUID()}`;
    try {
      await store.create(owner, demoState("newcomer"));
      await store.create(other, demoState("merchant"));
      await store.mutate(owner, (s) => {
        s.connected = true;
        s.assessment = assess(s.borrower, 1);
      });
      await store.mutate(other, (s) => {
        s.connected = true;
        s.assessment = assess(s.borrower, 1);
      });
      await store.refresh(owner);
      const first = await store.cashflow(owner);
      assert.equal(first.rows.length > 0, true);
      const income = first.rows.reduce(
        (n, r) => n + Number("income" in r ? r.income : 0),
        0,
      );
      assert.equal(income, 5050000);
      await store.mutate(owner, (s) => {
        s.borrower.records.at(-1)!.category = "transfer";
        s.revision++;
        s.assessment = assess(s.borrower, s.revision);
      });
      await store.refresh(owner);
      const revised = await store.cashflow(owner);
      assert.equal(
        revised.rows.reduce(
          (n, r) => n + Number("income" in r ? r.income : 0),
          0,
        ),
        5040000,
      );
      const budget = await Promise.all(
        Array.from({ length: 6 }, () =>
          store.takeProviderBudget(owner, "test-ai", 4),
        ),
      );
      assert.equal(budget.filter(Boolean).length, 4);
      const replica = new Store(
        ":memory:",
        process.env.FOLIO_TEST_DATABASE_URL,
      );
      await replica.init();
      try {
        assert.equal(
          await replica.takeProviderBudget(owner, "test-ai", 4),
          false,
        );
      } finally {
        await replica.close();
      }
      const originalRefresh = store.refreshAggregate.bind(store);
      store.refreshAggregate = async () => {
        throw Error("simulated maintenance");
      };
      try {
        assert.equal((await store.delete(owner)).cleanupPending, true);
        assert.equal((await store.cashflow(owner)).rows.length, 0);
        await assert.rejects(
          store.create(owner, demoState("newcomer"), true),
          /temporarily unavailable/,
        );
      } finally {
        store.refreshAggregate = originalRefresh;
      }
      const empty = demoState("newcomer");
      empty.borrower.records = [];
      empty.connected = false;
      await store.create(owner, empty, true);
      assert.equal(
        (await store.cashflow(owner)).rows.length,
        0,
        "old aggregate history cannot return after recreation",
      );
      await store.delete(owner);
      assert.equal((await store.cashflow(owner)).rows.length, 0);
      assert.ok(await store.get(other));
    } finally {
      await store.delete(other);
      await store.close();
    }
  },
);
