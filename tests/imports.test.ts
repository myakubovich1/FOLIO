import test from "node:test";
import assert from "node:assert/strict";
import {
  previewCsv,
  sampleCsv,
  minor,
  applyImport,
} from "../server/imports.js";
import { ownerState } from "../server/workspace.js";
import { assess } from "../server/assessment.js";
test("CSV exact decimal arithmetic, reconciliation and idempotent import preserve corrections", () => {
  assert.equal(minor("-10.05"), -1005);
  assert.throws(() => minor("1e3"));
  assert.throws(() => minor("1.005"));
  const p = previewCsv(sampleCsv(), "example.csv");
  assert.equal(p.errors.length, 0);
  assert.equal(p.reconciled, true);
  const s = ownerState();
  applyImport(s, p);
  const first = assess(s.borrower, s.revision);
  assert.equal(first.income, 5050000);
  assert.equal(first.expenses, 3600000);
  const row = s.borrower.records.find((r) =>
    r.description.startsWith("Returned deposit"),
  )!;
  row.category = "transfer";
  const again = applyImport(s, p);
  assert.equal(again.accepted, 0);
  assert.equal(again.duplicates, p.rows.length);
  assert.equal(assess(s.borrower).income, 5040000);
  assert.equal(row.originalCategory, "income");
});
test("CSV invalid dates, mixed currency and failed reconciliation stay visible", () => {
  const sample = sampleCsv();
  const dates = previewCsv(
    sample.replace("2025-01-10", "2025-02-30"),
    "invalid.csv",
  );
  assert.ok(dates.errors.length);
  const mixed = previewCsv(sample.replace('"USD"', '"EUR"'), "mixed.csv");
  assert.ok(mixed.errors.length);
  const balance = previewCsv(
    sample.replaceAll('"2200.00"', '"2200.01"'),
    "unbalanced.csv",
  );
  assert.equal(balance.reconciled, false);
  const s = ownerState();
  applyImport(s, balance);
  assert.equal(assess(s.borrower).score, null);
});

test("paired bill and payment records count the actual payment once", () => {
  const csv =
    "id,date,amount,currency,category,description,account_id,status,record_type,linked_record_id,coverage_start,coverage_end,coverage_complete,opening_balance,closing_balance,obligations_documented\n" +
    "bill,2025-01-03,-100.00,USD,expense,Rent bill,a,posted,bill,payment,2025-01-01,2025-04-01,true,1000.00,900.00,true\n" +
    "payment,2025-01-04,-100.00,USD,expense,Rent paid,a,posted,payment,bill,2025-01-01,2025-04-01,true,1000.00,900.00,true\n";
  const p = previewCsv(csv, "bill.csv");
  assert.equal(p.reconciled, true);
  const s = ownerState();
  applyImport(s, p);
  assert.equal(assess(s.borrower).expenses, 10000);
});

test("unknown or credit account types never supply liquid balance evidence", () => {
  for (const type of ["credit", "unknown"]) {
    const p = previewCsv(
      sampleCsv().replaceAll('"checking"', `"${type}"`),
      "account.csv",
    );
    const s = ownerState();
    applyImport(s, p);
    assert.equal(s.borrower.closingBalance, null);
    assert.equal(assess(s.borrower).score, null);
  }
});

test("overlapping complete statements deduplicate source IDs and preserve source values", () => {
  const s = ownerState();
  const p = previewCsv(sampleCsv(), "first.csv");
  applyImport(s, p);
  const revision = s.revision;
  const second = {
    ...structuredClone(p),
    id: "second",
    source: { ...p.source, id: "second-period" },
  };
  applyImport(s, second);
  assert.equal(s.borrower.records.length, p.rows.length);
  assert.equal(s.revision, revision);
  assert.equal(
    s.borrower.records.find((r) => r.id === p.rows[0].id)?.originalValues
      ?.amount,
    p.rows[0].originalValues?.amount,
  );
});

test("overlapping statement windows reconcile a deduplicated account; gaps abstain", () => {
  const header =
    "id,date,amount,currency,category,description,account_id,account_type,status,coverage_start,coverage_end,coverage_complete,opening_balance,closing_balance,obligations_documented\n";
  const statement = (
    months: string[],
    start: string,
    end: string,
    opening: number,
    closing: number,
  ) =>
    header +
    months
      .flatMap((m) => [
        `income-${m},2025-${m}-10,200.00,USD,income,Income,a,checking,posted,${start},${end},true,${opening}.00,${closing}.00,true`,
        `expense-${m},2025-${m}-11,-100.00,USD,expense,Expense,a,checking,posted,${start},${end},true,${opening}.00,${closing}.00,true`,
      ])
      .join("\n");
  const state = ownerState();
  applyImport(
    state,
    previewCsv(
      statement(["01", "02"], "2025-01-01", "2025-03-01", 1000, 1200),
      "first.csv",
    ),
  );
  applyImport(
    state,
    previewCsv(
      statement(["02", "03"], "2025-02-01", "2025-04-01", 1100, 1300),
      "second.csv",
    ),
  );
  assert.equal(state.borrower.records.length, 6);
  assert.equal(state.borrower.complete, true);
  assert.equal(state.borrower.minimumBalance, 110000);
  assert.equal(assess(state.borrower).income, 60000);
  const gap = ownerState();
  applyImport(
    gap,
    previewCsv(
      statement(["01"], "2025-01-01", "2025-02-01", 1000, 1100),
      "one.csv",
    ),
  );
  applyImport(
    gap,
    previewCsv(
      statement(["03"], "2025-03-01", "2025-04-01", 1200, 1300),
      "three.csv",
    ),
  );
  assert.equal(gap.borrower.complete, false);
  assert.equal(assess(gap.borrower).score, null);
});
