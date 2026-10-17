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
  assert.equal(p.rows[0].amount, 20000);
  assert.match(p.rows[0].sourceLocation!, /PDF page 1/);
  assert.equal(p.rows[0].interpretation, "model-suggested");
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
