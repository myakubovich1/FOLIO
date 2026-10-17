import type { Assessment, Borrower } from "../src/contracts.js";
export const MODEL = "folio-v1.0.0";
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const validDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date;
export function assess(b: Borrower, revision = 1): Assessment {
  const active = b.records.filter(
    (r) => r.status !== "pending" && !r.excludedReason,
  );
  const missing: string[] = [];
  const days = (Date.parse(b.end) - Date.parse(b.start)) / 86400000;
  if (!b.complete)
    missing.push("Complete source coverage, including missing periods");
  if (!Number.isFinite(days) || days < 90 || b.months < 3)
    missing.push(
      "At least 90 days and three complete months of useful history",
    );
  if (b.seasonal && (days < 730 || b.months < 24))
    missing.push("Two complete years covering the seasonal cycle");
  if (b.closingBalance === null || b.minimumBalance === null)
    missing.push("Documented liquid balance history");
  else if (
    !Number.isSafeInteger(b.closingBalance) ||
    !Number.isSafeInteger(b.minimumBalance) ||
    b.minimumBalance > b.closingBalance
  )
    missing.push("Valid documented balances and consistent minimum balance");
  if (!b.obligationsDocumented)
    missing.push("Documented obligations and their coverage");
  if (
    b.balanceEvidence === "self-reported" ||
    b.obligationEvidence === "self-reported"
  )
    missing.push(
      "Source evidence for balances and obligations; self-reported values alone are insufficient",
    );
  if (b.records.some((r) => r.currency !== b.currency))
    missing.push("A single currency per assessment");
  if (
    b.records.some((r) => !Number.isSafeInteger(r.amount) || !validDate(r.date))
  )
    missing.push("Valid dated records and safe integer amounts");
  if (
    !validDate(b.start) ||
    !validDate(b.end) ||
    b.records.some((r) => r.date < b.start || r.date >= b.end)
  )
    missing.push("Records within the stated source coverage dates");
  if (
    active.some((r) =>
      r.category === "expense"
        ? r.amount >= 0
        : ["income", "refund", "borrowing"].includes(r.category) &&
          r.amount <= 0,
    )
  )
    missing.push(
      "Resolve classifications that conflict with payment direction",
    );
  if (active.some((r) => r.category === "unknown"))
    missing.push("Review unresolved classifications");
  if (new Set(b.records.map((r) => r.id)).size !== b.records.length)
    missing.push("Resolve duplicate source records");
  let income = 0,
    expenses = 0;
  for (const r of active) {
    if (r.category === "income" && r.amount > 0) income += r.amount;
    if (r.category === "expense" && r.amount < 0) expenses -= r.amount;
    if (r.category === "refund" && r.amount > 0) expenses -= r.amount;
  }
  expenses = Math.max(0, expenses);
  if (!Number.isSafeInteger(income) || !Number.isSafeInteger(expenses))
    missing.push("Financial totals within supported range");
  if (income <= 0 || expenses <= 0)
    missing.push("Positive documented income and expense totals");
  const averageExpenses = b.months > 0 ? expenses / b.months : 0;
  const monthly = [...new Set(active.map((r) => r.date.slice(0, 7)))]
    .sort()
    .map((month) => {
      const rows = active.filter((r) => r.date.startsWith(month));
      return {
        month,
        income: rows.reduce(
          (n, r) => n + (r.category === "income" ? Math.max(0, r.amount) : 0),
          0,
        ),
        spending: rows.reduce(
          (n, r) => n + (r.category === "expense" ? Math.max(0, -r.amount) : 0),
          0,
        ),
        refunds: rows.reduce(
          (n, r) => n + (r.category === "refund" ? Math.max(0, r.amount) : 0),
          0,
        ),
      };
    });
  const factors = missing.length
    ? []
    : [
        {
          name: "Residual cash-flow capacity",
          points: 50 * clamp((income - expenses) / income / 0.4),
          maximum: 50,
          evidence: active
            .filter((r) => ["income", "expense", "refund"].includes(r.category))
            .map((r) => r.id),
        },
        {
          name: "Liquid reserves",
          points: 30 * clamp(b.closingBalance! / averageExpenses / 3),
          maximum: 30,
          evidence: ["source-closing-balance"],
        },
        {
          name: "Cycle resilience",
          points: 20 * clamp(b.minimumBalance! / averageExpenses),
          maximum: 20,
          evidence: ["source-minimum-balance"],
        },
      ];
  return {
    model: MODEL,
    revision,
    score: missing.length
      ? null
      : Math.round(factors.reduce((sum, f) => sum + f.points, 0)),
    confidence: missing.length
      ? "Limited / unresolved evidence"
      : b.sourceKind === "uploaded"
        ? "User-provided statement · reconciled coverage"
        : b.sourceKind === "sandbox"
          ? "Banking simulation · reviewed source coverage"
          : "Complete synthetic source coverage",
    missing,
    income,
    expenses,
    net: income - expenses,
    averageExpenses,
    monthly,
    factors,
    currency: b.currency,
    start: b.start,
    end: b.end,
    validation:
      "Experimental scorecard v1 · software checks only; no repayment-outcome validation",
    market: {
      id: b.currency === "USD" ? "us-demo" : "ke-demo",
      currency: b.currency,
      version: "market-v1",
    },
    sourceKind: b.sourceKind || "synthetic",
    reasons: missing.length
      ? missing.map((message) => ({
          code: "EVIDENCE_REQUIRED",
          message,
          evidence: [],
        }))
      : [
          {
            code: income > expenses ? "POSITIVE_RESIDUAL" : "NO_RESIDUAL",
            message:
              income > expenses
                ? "Observed income exceeds recorded expenses."
                : "Recorded expenses use all or more than observed income.",
            evidence: active
              .filter((r) =>
                ["income", "expense", "refund"].includes(r.category),
              )
              .map((r) => r.id),
          },
          {
            code:
              b.closingBalance! < averageExpenses
                ? "LOW_LIQUID_BUFFER"
                : "LIQUID_BUFFER_OBSERVED",
            message:
              b.closingBalance! < averageExpenses
                ? "The documented liquid balance covers less than one observed month of expenses."
                : "Documented liquid reserves contribute separately from income.",
            evidence: ["source-closing-balance"],
          },
        ],
  };
}
