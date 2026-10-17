import "../server/config.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { demoState } from "../server/workspace.js";
import { assess } from "../server/assessment.js";
import {
  deterministicExplanation,
  validateClaims,
} from "../server/explanations.js";
import { geminiExplanation, suggestClassifications } from "../server/gemini.js";
import type { Category } from "../src/contracts.js";
const cases = JSON.parse(readFileSync("evals/cases.json", "utf8")) as {
  version: string;
  profiles: {
    id: string;
    score: number | null;
    income: number;
    expenses: number;
  }[];
  classification: {
    id: string;
    description: string;
    amount: number;
    acceptable: Category[];
  }[];
};
const results = [];
const live = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL);
for (const expected of cases.profiles) {
  const s = demoState(expected.id);
  s.connected = true;
  s.assessment = assess(s.borrower, 1);
  assert.equal(s.assessment.score, expected.score);
  assert.equal(s.assessment.income, expected.income);
  assert.equal(s.assessment.expenses, expected.expenses);
  const explanation = deterministicExplanation(s);
  assert.equal(explanation.revision, 1);
  assert.throws(() =>
    validateClaims(s, [{ kind: "cashflow", evidence: ["does-not-exist"] }]),
  );
  let liveExplanation: unknown = {
    blocked: "GEMINI_API_KEY / GEMINI_MODEL absent",
  };
  if (live) {
    try {
      const e = await geminiExplanation(s, "How was my score calculated?");
      liveExplanation = {
        passed: true,
        evidenceValidity: true,
        numericalConsistency: true,
        paragraphs: e.paragraphs.length,
        model: e.model,
        promptVersion: e.promptVersion,
      };
    } catch {
      liveExplanation = {
        passed: false,
        error: "Provider or validation failure; no fixture fallback",
      };
    }
  }
  results.push({
    profile: expected.id,
    deterministicNumericalConsistency: true,
    invalidCitationRejected: true,
    liveExplanation,
  });
}
let classifications: unknown = {
  blocked: "GEMINI_API_KEY / GEMINI_MODEL absent",
};
if (live) {
  const s = demoState("newcomer");
  s.borrower.records = cases.classification.map((c) => ({
    id: c.id,
    description: c.description,
    amount: c.amount,
    date: "2025-01-10",
    currency: "USD",
    category: "unknown",
    originalCategory: "unknown",
  }));
  try {
    const r = await suggestClassifications(s);
    classifications = cases.classification.map((c) => ({
      id: c.id,
      actual: r.find((x) => x.id === c.id)?.category || "unknown",
      acceptable: c.acceptable,
      passed: c.acceptable.includes(
        r.find((x) => x.id === c.id)?.category || "unknown",
      ),
    }));
  } catch {
    classifications = {
      passed: false,
      error: "Provider or validation failure",
    };
  }
}
const report = {
  at: new Date().toISOString(),
  version: cases.version,
  model: process.env.GEMINI_MODEL || null,
  promptVersion: "folio-evidence-v1",
  scope:
    "Synthetic human-authored expectations; no repayment or real-world extraction accuracy claim",
  results,
  classifications,
  extraction: {
    accuracy: null,
    status:
      "Requires live synthetic PDF extraction and human comparison; not measured by these arithmetic/claim tests",
  },
};
mkdirSync("output/verification", { recursive: true });
writeFileSync(
  "output/verification/ai-evaluation.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
