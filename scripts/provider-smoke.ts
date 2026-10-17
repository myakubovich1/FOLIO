import "../server/config.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import { NessieClient } from "../server/nessie.js";
import { ownerState, demoState } from "../server/workspace.js";
import { applyImport } from "../server/imports.js";
import { assess } from "../server/assessment.js";
import { geminiExplanation, extractStatement } from "../server/gemini.js";
import { snapshot } from "../server/passports.js";
import { passportPdf } from "../server/passport-pdf.js";
import { Store } from "../server/store.js";
const report: Record<string, unknown> = {
  at: new Date().toISOString(),
  scope:
    "Actual configured provider calls using only dedicated synthetic banking resources and synthetic PDF input; never a fallback claim of live success",
};
let state = demoState("newcomer");
state.connected = true;
state.assessment = assess(state.borrower, 1);
if (process.env.NESSIE_API_KEY && process.env.NESSIE_CUSTOMER_ID) {
  try {
    const result = await new NessieClient().ingest();
    if (!result.previews.some((p) => p.rows.length))
      throw Error("No usable movements");
    state = ownerState("Synthetic provider smoke");
    for (const p of result.previews) if (p.rows.length) applyImport(state, p);
    state.assessment = assess(state.borrower, state.revision);
    state.providerSync = {
      nessie: {
        at: new Date().toISOString(),
        accounts: result.previews.length,
        records: state.borrower.records.length,
        capabilities: result.capabilities,
      },
    };
    report.nessie = {
      liveRequestSucceeded: true,
      normalizedRecords: state.borrower.records.length,
      capabilities: result.capabilities,
      assessment: {
        score: state.assessment.score,
        income: state.assessment.income,
        expenses: state.assessment.expenses,
        missing: state.assessment.missing,
        currency: state.assessment.currency,
      },
      trace: state.borrower.records.slice(0, 3).map((r) => ({
        reference: r.sourceLocation,
        normalizedId: r.id,
        date: r.date,
        amount: r.amount,
        currency: r.currency,
        category: r.category,
        status: r.status,
      })),
      note: "Unknown deposits require human purpose confirmation; no full statement/balance history is invented.",
    };
  } catch {
    report.nessie = {
      liveRequestSucceeded: false,
      error:
        "Nessie read/schema validation failed. Check dedicated customer, key, base and current capabilities.",
    };
  }
} else
  report.nessie = {
    liveRequestSucceeded: false,
    blocked: "NESSIE_API_KEY / NESSIE_CUSTOMER_ID absent",
  };
// Reproduce the review stage only for the exact synthetic deposits seeded by
// this repository. Never infer arbitrary bank deposits as earnings.
if (state.borrower.sourceKind === "sandbox") {
  let confirmed = 0;
  for (const r of state.borrower.records)
    if (
      r.amount > 0 &&
      r.category === "unknown" &&
      /^FOLIO-SEED-v1-2025-\d{2}-synthetic-client-payment$/.test(
        r.originalValues?.description || "",
      )
    ) {
      r.category = "income";
      r.interpretation = "user-confirmed";
      confirmed++;
    }
  if (confirmed) {
    state.revision++;
    state.assessment = assess(state.borrower, state.revision);
  }
  report.syntheticReview = {
    confirmedSeedDeposits: confirmed,
    incomeAfterReview: state.assessment?.income,
    scoreAfterReview: state.assessment?.score,
    note: "Scripted confirmation of our explicitly marked synthetic fixture only. Original categories retained. Withdrawals and missing history remain unresolved; no automatic deposit-to-income rule is used by the application.",
  };
}
if (process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL) {
  try {
    const explanation = await geminiExplanation(
      state,
      "Explain the observed income and missing records. Can this prove loan approval?",
    );
    state.explanation = explanation;
    report.gemini = {
      liveGenerationSucceeded: true,
      inputKind: state.borrower.sourceKind,
      revision: explanation.revision,
      model: explanation.model,
      promptVersion: explanation.promptVersion,
      paragraphs: explanation.paragraphs,
      evidenceValidated: true,
    };
  } catch {
    report.gemini = {
      liveGenerationSucceeded: false,
      error:
        "Gemini request or evidence validation failed; no deterministic result was substituted for this check.",
    };
  }
  try {
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc
        .fontSize(12)
        .text(
          "FOLIO SYNTHETIC STATEMENT - EVALUATION ONLY\nAccount alias: eval-checking. Account type: Checking. Currency USD.\nComplete account coverage: January 1, 2025 through March 31, 2025 (coverage end exclusive April 1, 2025).\nOpening balance: USD 1000.00. Closing balance: USD 1100.00.\nObligations documented: false (not established in this statement).\nPosted movements:\nID salary: January 10, 2025, +200.00 USD, Payroll earnings, transaction.\nID rent: January 11, 2025, -100.00 USD, Rent payment, transaction.\nNo other posted movements. This is synthetic software evaluation, not real personal information.",
        );
      doc.end();
    });
    const preview = await extractStatement(bytes, "synthetic-evaluation.pdf");
    const expected = [
      { date: "2025-01-10", amount: 20000, category: "income" },
      { date: "2025-01-11", amount: -10000, category: "expense" },
    ];
    report.pdfExtraction = {
      liveRequestSucceeded: true,
      expectedRows: 2,
      actualRows: preview.rows.length,
      fieldsMatched: expected.filter((e) =>
        preview.rows.some(
          (r) =>
            r.date === e.date &&
            r.amount === e.amount &&
            r.category === e.category,
        ),
      ).length,
      reconciled: preview.reconciled,
      sourceReferencesValid: preview.rows.every((r) =>
        r.sourceLocation?.includes("PDF page 1"),
      ),
      invalidFields: preview.errors.length,
      note: "Two-row synthetic fixture only; not real-world document accuracy.",
    };
  } catch {
    report.pdfExtraction = {
      liveRequestSucceeded: false,
      error: "Synthetic PDF extraction or validation failed",
    };
  }
} else {
  report.gemini = {
    liveGenerationSucceeded: false,
    blocked: "GEMINI_API_KEY / GEMINI_MODEL absent",
  };
  report.pdfExtraction = {
    liveRequestSucceeded: false,
    blocked: "Gemini configuration absent",
  };
}
if (state.borrower.sourceKind === "sandbox") {
  const store = new Store(":memory:", process.env.DATABASE_URL || undefined);
  const owner = `provider-smoke:${randomUUID()}`;
  await store.init();
  try {
    await store.create(owner, state);
    await store.mutate(owner, () => {});
    const current = await store.get(owner);
    const passport = snapshot(current!);
    mkdirSync("output/verification", { recursive: true });
    writeFileSync(
      "output/verification/nessie-live-passport.pdf",
      await passportPdf(passport),
    );
    report.persistence = {
      backend: store.pool ? "PostgreSQL/Timescale" : "isolated SQLite",
      normalizedRecordsPersisted: current!.borrower.records.length,
      passportSource: passport.source,
      passportRevision: passport.assessment.revision,
      pdfProduced: true,
    };
  } finally {
    await store.delete(owner);
    await store.close();
  }
}
mkdirSync("output/verification", { recursive: true });
writeFileSync(
  "output/verification/provider-smoke.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
