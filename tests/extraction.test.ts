import test from "node:test";
import assert from "node:assert/strict";
import { previewExtraction } from "../server/gemini.js";
const statement = {
  coverage_start: "2025-01-01",
  coverage_end: "2025-04-01",
  coverage_complete: true,
  opening_balance: "1000.00",
  closing_balance: "1100.00",
  currency: "USD",
  account_alias: "test",
  account_type: "checking",
  obligations_documented: true,
  rows: [
    {
      id: "income",
      date: "2025-01-10",
      amount: "200.00",
      category: "income",
      description: "Payroll",
      page: 1,
      status: "posted",
      record_type: "transaction",
      linked_record_id: null,
    },
    {
      id: "expense",
      date: "2025-01-11",
      amount: "-100.00",
      category: "expense",
      description: "Rent",
      page: 1,
      status: "posted",
      record_type: "payment",
      linked_record_id: null,
    },
  ],
};
test("structured extraction verifies exact amounts, source pages, calendar and unknown fields", () => {
  const p = previewExtraction(statement, "statement.pdf", 1);
  assert.equal(p.reconciled, true);
  const byn = previewExtraction(
    { ...statement, currency: "BYN" },
    "byn-statement.pdf",
    1,
  );
  assert.equal(byn.reconciled, true);
  assert.ok(byn.rows.every((row) => row.currency === "BYN"));
  assert.equal(byn.rows[0].amount, 20000);
  assert.equal(p.rows[0].amount, 20000);
  assert.match(p.rows[0].sourceLocation!, /PDF page 1/);
  assert.equal(p.rows[0].interpretation, "model-suggested");
  assert.equal(p.rows[0].recordType, "transaction");
  assert.equal(p.rows[1].recordType, "payment");
  assert.equal(p.rows[0].linkedRecordId, undefined);
  assert.throws(
    () =>
      previewExtraction(
        { ...statement, rows: [{ ...statement.rows[0], page: 2 }] },
        "bad.pdf",
        1,
      ),
    /outside/,
  );
  const missing = previewExtraction(
    { ...statement, rows: [{ ...statement.rows[0], amount: null }] },
    "unknown.pdf",
    1,
  );
  assert.equal(missing.rows.length, 0);
  assert.ok(missing.errors.length);
  const malformed = previewExtraction(
    { ...statement, rows: [{ ...statement.rows[0], date: "2025-02-30" }] },
    "bad.pdf",
    1,
  );
  assert.ok(malformed.errors.length);
});

test("PDF normalization preserves bill/payment pairing so one obligation is counted once", () => {
  const rows = [
    statement.rows[0],
    {
      ...statement.rows[1],
      record_type: "payment",
      linked_record_id: "bill",
    },
    {
      ...statement.rows[1],
      id: "bill",
      record_type: "bill",
      linked_record_id: "expense",
    },
  ];
  const preview = previewExtraction(
    { ...statement, rows },
    "bill-and-payment.pdf",
    1,
  );
  assert.equal(preview.reconciled, true);
  assert.equal(preview.rows.filter((r) => r.excludedReason).length, 1);
  assert.equal(
    preview.rows
      .filter((r) => !r.excludedReason && r.category === "expense")
      .reduce((n, r) => n - r.amount, 0),
    10000,
  );
});
