import { randomUUID } from "node:crypto";
import type { State, Passport } from "../src/contracts.js";
import { SCORECARD_CONFIG } from "./workspace.js";
export function snapshot(
  s: State,
  disclosure = { factors: true, cashflow: true },
): Passport {
  const a = s.assessment;
  if (!a) throw Error("Review records before generating a passport.");
  return {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    ...(s.providerSync?.nessie
      ? {
          apiProvenance: {
            provider: "nessie" as const,
            readAt: s.providerSync.nessie.at,
            records: s.providerSync.nessie.records,
            accounts: s.providerSync.nessie.accounts,
            note: "Actual API read of synthetic banking data; complete statement coverage and historical balances are not established by this read.",
          },
        }
      : {}),
    source:
      s.sources
        ?.map((x) => `${x.label}${x.connected ? "" : " (disconnected)"}`)
        .join("; ") || "Saved synthetic demo data",
    disclosure,
    modelConfig: structuredClone(SCORECARD_CONFIG),
    assessment: {
      model: a.model,
      revision: a.revision,
      score: a.score,
      confidence: a.confidence,
      missing: [...a.missing],
      currency: a.currency,
      start: a.start,
      end: a.end,
      validation: a.validation,
      market: a.market,
      sourceKind: a.sourceKind,
      reasons: a.reasons?.map((r) => ({
        code: r.code,
        message: r.message,
        evidence: [],
      })),
      factors: disclosure.factors
        ? a.factors.map((f) => ({
            name: f.name,
            points: f.points,
            maximum: f.maximum,
          }))
        : [],
      ...(disclosure.cashflow
        ? {
            income: a.income,
            expenses: a.expenses,
            net: a.net,
            averageExpenses: a.averageExpenses,
          }
        : {}),
    },
    limitations:
      "Experimental scorecard; no predictive repayment validation or lender acceptance established. This is not a lending decision. Cash activity outside connected coverage is unknown. Source classifications may be user-confirmed and are not independent verification. Revocation cannot recall downloaded copies.",
  };
}
