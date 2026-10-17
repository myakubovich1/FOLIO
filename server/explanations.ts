import type { State, Explanation } from "../src/contracts.js";
export const PROMPT_VERSION = "folio-evidence-v3";
export const kinds = [
  "cashflow",
  "factors",
  "liquidity",
  "coverage",
  "exclusions",
  "seasonality",
  "improvement",
  "limitation",
] as const;
export type ClaimKind = (typeof kinds)[number];
const money = (n: number, c: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(n / 100);
export function evidenceTools(s: State) {
  return {
    getMetrics: () => {
      const a = s.assessment;
      if (!a) throw Error("An assessment is required.");
      return {
        income: a.income,
        expenses: a.expenses,
        net: a.net,
        score: a.score,
        closingBalance: s.borrower.closingBalance,
        minimumBalance: s.borrower.minimumBalance,
        months: s.borrower.months,
        currency: a.currency,
        missing: a.missing,
        model: a.model,
        revision: a.revision,
        factors: a.factors.map((f) => ({
          name: f.name,
          points: f.points,
          maximum: f.maximum,
        })),
        incomePattern: s.borrower.incomePattern || "unknown",
      };
    },
    getRecords: (ids: string[]) =>
      s.borrower.records
        .filter((r) => ids.includes(r.id))
        .slice(0, 50)
        .map((r) => ({
          id: r.id,
          date: r.date,
          amount: r.amount,
          currency: r.currency,
          category: r.category,
          status: r.status || "posted",
          excluded: Boolean(r.excludedReason),
        })),
  };
}
export function paragraph(s: State, kind: ClaimKind) {
  const a = s.assessment!;
  const b = s.borrower;
  const records = b.records.filter(
    (r) => r.status !== "pending" && !r.excludedReason,
  );
  switch (kind) {
    case "cashflow":
      return {
        text: `The records show ${money(a.income, a.currency)} in external income and ${money(a.expenses, a.currency)} in expenses after refunds. The recorded difference is ${money(a.net, a.currency)} over the observed period.${a.score === null ? " Missing or unclassified costs are not zero expenses; this difference is not confirmed disposable income." : ""}`,
        evidence: records
          .filter((r) => ["income", "expense", "refund"].includes(r.category))
          .slice(0, 12)
          .map((r) => r.id),
        metrics: ["income", "expenses", "net"],
      };
    case "factors":
      return {
        text:
          a.score === null
            ? "Factor contributions remain unavailable until the required evidence is complete."
            : a.factors
                .map(
                  (f) =>
                    `${f.name}: ${f.points.toFixed(2)} of ${f.maximum} possible points`,
                )
                .join("; ") +
              ". These fixed contributions are summed and rounded once; they are not repayment probabilities.",
        evidence: [...new Set(a.factors.flatMap((f) => f.evidence))].slice(
          0,
          12,
        ),
        metrics: ["factors"],
      };
    case "liquidity":
      return {
        text:
          b.closingBalance === null
            ? "A documented liquid balance is missing, so the model cannot assess reserves."
            : `The documented closing liquid balance is ${money(b.closingBalance, a.currency)}. Reserves contribute separately from income; this is a source figure, not a promise of future capacity.`,
        evidence: b.closingBalance === null ? [] : ["source-closing-balance"],
        metrics: ["closingBalance"],
      };
    case "coverage":
      return {
        text:
          a.score === null
            ? `More evidence is needed: ${a.missing.join("; ")}. An absent traditional credit file is not the reason for abstention.`
            : `The index is ${a.score} out of 100 under experimental scorecard v1. It uses ${b.months} months of source coverage and does not use a traditional credit score. Evidence confidence is reported separately.`,
        evidence: [],
        metrics: ["score", "months", "missing"],
      };
    case "exclusions":
      return {
        text: "Internal transfers and borrowing are excluded from income. Pending items, unpaid invoices and duplicate bill evidence do not count as observed cash receipts or duplicate spending. Source corrections remain traceable.",
        evidence: records
          .filter((r) => ["transfer", "borrowing"].includes(r.category))
          .slice(0, 8)
          .map((r) => r.id),
        metrics: [],
      };
    case "improvement": {
      const weakest = [...a.factors].sort(
        (x, y) => x.points / x.maximum - y.points / y.maximum,
      )[0];
      return {
        text: !weakest
          ? `The next useful step is to supply the missing evidence: ${a.missing.join("; ")}. A missing record cannot be replaced with a favorable assumption.`
          : `The smallest relative contribution is ${weakest.name}: ${weakest.points.toFixed(2)} of ${weakest.maximum} points. You can explore how lower observed expenses or a stronger documented cash buffer would change this model, without changing your records. These are conditional calculations, not a promise of credit approval.`,
        evidence: weakest?.evidence.slice(0, 12) || [],
        metrics: ["factors", "missing"],
      };
    }
    case "seasonality":
      return {
        text: b.seasonal
          ? "This profile declares seasonal income. The model requires two complete years and evaluates the full observed cycle; low-income months alone are not a penalty. The records do not establish a person’s exact occupation."
          : "The model does not score occupation labels or infer a profession from merchants. Irregular payment timing alone is not a score penalty.",
        evidence: records
          .filter((r) => r.category === "income")
          .slice(0, 8)
          .map((r) => r.id),
        metrics: ["months", "incomePattern"],
      };
    default:
      return {
        text: "This experimental assessment is not a lending decision or a probability of default. No lender acceptance or predictive accuracy has been established. Missing cash activity and records outside source coverage remain unknown.",
        evidence: [],
        metrics: [],
      };
  }
}
export function deterministicExplanation(s: State, question = ""): Explanation {
  if (!s.assessment)
    throw Error("Add records before requesting an explanation.");
  const focus = /improv|next step|increase/i.test(question)
    ? ["coverage", "improvement", "limitation"]
    : /transfer|borrow|refund/i.test(question)
      ? ["exclusions", "cashflow", "limitation"]
      : /season|irregular|occupation/i.test(question)
        ? ["seasonality", "coverage", "limitation"]
        : /missing|no.*credit|history/i.test(question)
          ? ["coverage", "limitation"]
          : ["coverage", "factors", "cashflow", "liquidity", "limitation"];
  return {
    revision: s.revision,
    model: s.assessment.model,
    promptVersion: PROMPT_VERSION,
    provider: "deterministic",
    at: new Date().toISOString(),
    paragraphs: focus.map((k) => paragraph(s, k as ClaimKind)),
    limitation:
      "Calculated explanation from the current evidence revision; no language-model request was used.",
  };
}
export function validateClaims(
  s: State,
  claims: { kind: ClaimKind; evidence: string[] }[],
) {
  if (!s.assessment) throw Error("Assessment unavailable");
  const valid = new Set([
    ...s.borrower.records.map((r) => r.id),
    "source-closing-balance",
    "source-minimum-balance",
  ]);
  if (!claims.length || claims.length > 8)
    throw Error("Unsupported explanation structure");
  for (const claim of claims) {
    if (
      !kinds.includes(claim.kind) ||
      claim.evidence.some((id) => !valid.has(id))
    )
      throw Error("Unsupported claim or evidence reference");
    const allowed = new Set(paragraph(s, claim.kind).evidence);
    if (claim.evidence.some((id) => !allowed.has(id)))
      throw Error("Evidence does not support this explanation kind");
  }
  return claims.map((c) => ({
    ...paragraph(s, c.kind),
    evidence: c.evidence.length ? c.evidence : paragraph(s, c.kind).evidence,
  }));
}
