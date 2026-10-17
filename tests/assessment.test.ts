import test from "node:test";
import assert from "node:assert/strict";
import { assess } from "../server/assessment.js";
import { seed, profiles } from "../server/seeds.js";
test("newcomer result matches hand calculation, factors and money", () => {
  const a = assess(seed("newcomer"));
  assert.equal(a.income, 5050000);
  assert.equal(a.expenses, 3600000);
  assert.equal(a.net, 1450000);
  const expected =
    125 * (1450000 / 5050000) +
    30 * (600000 / 300000 / 3) +
    20 * (220000 / 300000);
  assert.equal(a.score, Math.round(expected));
  assert.equal(a.score, 71);
  assert.ok(
    Math.abs(a.factors.reduce((n, f) => n + f.points, 0) - expected) < 1e-10,
  );
});
test("all five profiles give distinct scored outcomes or justified abstention", () => {
  const results = profiles.map((p) => assess(seed(p.id)));
  assert.equal(new Set(results.map((a) => a.score)).size, 5);
  assert.equal(results[4].score, null);
  assert.ok(results[4].missing.length > 0);
  assert.equal(results[2].score, 85);
});
test("currency scaling and identity labels do not affect ratios", () => {
  const b = seed("newcomer");
  const original = assess(b);
  b.name = "Different";
  b.context = "Different nationality, occupation and market";
  b.currency = "KES";
  b.records.forEach((r) => {
    r.amount *= 100;
    r.currency = "KES";
  });
  b.minimumBalance! *= 100;
  b.closingBalance! *= 100;
  assert.equal(assess(b).score, original.score);
});
test("correction excludes transfer, changes revision, and preserves original category", () => {
  const b = seed("newcomer");
  const first = assess(b);
  b.records.at(-1)!.category = "transfer";
  const next = assess(b, 2);
  assert.equal(next.income, first.income - 10000);
  assert.equal(next.revision, 2);
  assert.equal(b.records.at(-1)!.originalCategory, "income");
});
test("missing balances, unknown rows, mixed currency, duplicates and insufficient seasons abstain", () => {
  for (const mutate of [
    (b: ReturnType<typeof seed>) => (b.closingBalance = null),
    (b: ReturnType<typeof seed>) => (b.records[0].category = "unknown"),
    (b: ReturnType<typeof seed>) => (b.records[0].currency = "EUR"),
    (b: ReturnType<typeof seed>) => b.records.push(b.records[0]),
    (b: ReturnType<typeof seed>) => {
      b.seasonal = true;
    },
  ]) {
    const b = seed("newcomer");
    mutate(b);
    assert.equal(assess(b).score, null);
  }
});
test("borrowing is excluded; refunds reduce expenses, not income", () => {
  const b = seed("newcomer"),
    old = assess(b);
  const template = b.records[0];
  b.records.push(
    {
      ...template,
      id: "loan",
      amount: 500000,
      category: "borrowing",
      originalCategory: "borrowing",
    },
    {
      ...template,
      id: "refund",
      amount: 20000,
      category: "refund",
      originalCategory: "refund",
    },
  );
  const a = assess(b);
  assert.equal(a.income, old.income);
  assert.equal(a.expenses, old.expenses - 20000);
});
test("improving a known liquid balance never reduces the result", () => {
  const b = seed("newcomer"),
    a = assess(b);
  b.closingBalance! += 100000;
  assert.ok(assess(b).score! >= a.score!);
});

test("contradictory correction directions, invalid calendar dates and out-of-period rows abstain", () => {
  for (const mutate of [
    (b: ReturnType<typeof seed>) => {
      b.records.find((r) => r.category === "expense")!.category = "income";
    },
    (b: ReturnType<typeof seed>) => {
      b.records[0].date = "2025-02-30";
    },
    (b: ReturnType<typeof seed>) => {
      b.records[0].date = b.end;
    },
    (b: ReturnType<typeof seed>) => {
      b.minimumBalance = NaN;
    },
  ]) {
    const b = seed("newcomer");
    mutate(b);
    assert.equal(assess(b).score, null);
  }
});

test("monthly chart aggregates multiple receipts and reconciles to period totals", () => {
  const a = assess(seed("newcomer"));
  assert.equal(a.monthly.find((m) => m.month === "2025-02")!.income, 430000);
  assert.equal(
    a.monthly.reduce((n, m) => n + m.income, 0),
    a.income,
  );
  assert.equal(
    a.monthly.reduce((n, m) => n + m.spending - m.refunds, 0),
    a.expenses,
  );
});
