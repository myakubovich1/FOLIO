import PDFDocument from "pdfkit";
import { resolve } from "node:path";
import type { Passport } from "../src/contracts.js";
const text = (s: string) =>
  s
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/→/g, "to")
    .replace(/·/g, "|");
const amount = (n: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n / 100);
export function passportPdf(p: Passport): Promise<Buffer> {
  return new Promise((resolvePdf, reject) => {
    const d = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: {
        Title: "Folio financial passport",
        Author: "Folio",
        Subject: "Experimental alternative credit assessment",
      },
    });
    const chunks: Buffer[] = [];
    d.on("data", (chunk) => chunks.push(chunk));
    d.on("error", reject);
    d.on("end", () => resolvePdf(Buffer.concat(chunks)));
    d.registerFont(
      "Inter",
      resolve(
        "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      ),
    );
    d.registerFont(
      "InterBold",
      resolve(
        "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      ),
    );
    d.registerFont(
      "InterLogo",
      resolve(
        "node_modules/@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff",
      ),
    );
    const green = "#9FE870",
      forest = "#163300",
      muted = "#454745";
    const heading = (s: string) => {
      d.fillColor(forest)
        .font("InterBold")
        .fontSize(15)
        .text(text(s), 48, d.y, { width: 499 });
      d.moveDown(0.6);
    };
    const paragraph = (s: string) => {
      d.fillColor(muted)
        .font("Inter")
        .fontSize(10)
        .text(text(s), 48, d.y, { width: 499, lineGap: 4 });
      d.moveDown(0.8);
    };
    d.rect(0, 0, d.page.width, 12).fill(green);
    d.save().translate(48, 38).roundedRect(0, 0, 32, 32, 8).fill(forest);
    d.path("M9 7h17l-3 6H15l-1 3h9l-3 6h-8l-1 4H5z").fill(green);
    d.restore();
    d.fillColor(forest).font("InterLogo").fontSize(31).text("folio", 88, 38);
    d.font("Inter")
      .fontSize(9)
      .text("FINANCIAL PASSPORT", 330, 53, { align: "right" });
    d.y = 110;
    d.font("InterBold")
      .fontSize(27)
      .text("A clearer picture of\nfinancial capacity.", 48, d.y, {
        lineGap: 3,
      });
    d.moveDown(0.6);
    paragraph(p.source);
    const a = p.assessment;
    d.roundedRect(48, d.y, 499, 110, 15).fill("#E2F6D5");
    const top = d.y;
    d.fillColor(forest)
      .font("InterBold")
      .fontSize(48)
      .text(a.score === null ? "--" : String(a.score), 68, top + 17);
    d.font("Inter")
      .fontSize(12)
      .text(
        a.score === null ? "More evidence needed" : "Folio Credit Index / 100",
        190,
        top + 28,
        { width: 320 },
      );
    d.fontSize(9).text("Experimental scorecard v1", 190, top + 56);
    d.y = top + 130;
    heading("Evidence and reporting period");
    paragraph(
      `${a.confidence}\n${a.start} to ${a.end} (end exclusive)\nInput revision ${a.revision} | ${a.currency} | Generated ${p.generatedAt.slice(0, 10)} UTC`,
    );
    if (p.disclosure?.cashflow !== false) {
      heading("Observed cash flow");
      const values = [
        ["External income", a.income],
        ["Expenses, net of refunds", a.expenses],
        ["Residual cash flow", a.net],
      ] as const;
      for (const [label, value] of values) {
        const y = d.y;
        d.fillColor(muted)
          .font("Inter")
          .fontSize(10)
          .text(label, 48, y, { width: 320 });
        d.fillColor(forest)
          .font("InterBold")
          .text(amount(value ?? 0, a.currency), 365, y, {
            width: 182,
            align: "right",
          });
        d.y = y + 26;
      }
    }
    if (a.factors.length) {
      d.moveDown(0.4);
      heading("What contributes to the index");
      for (const f of a.factors) {
        const y = d.y;
        d.fillColor(muted)
          .font("Inter")
          .fontSize(10)
          .text(f.name, 48, y, { width: 350 });
        d.fillColor(forest)
          .font("InterBold")
          .text(`${f.points.toFixed(2)} / ${f.maximum}`, 410, y, {
            width: 137,
            align: "right",
          });
        d.y = y + 25;
      }
    }
    if (a.missing.length) {
      heading("What is needed next");
      for (const missing of a.missing) paragraph(missing);
    }
    d.addPage();
    d.rect(0, 0, d.page.width, 12).fill(green);
    d.y = 48;
    heading("How to read this passport");
    paragraph(a.validation);
    if (a.score === null && p.disclosure?.cashflow !== false)
      paragraph(
        "Totals describe reviewed records only. Missing or unclassified costs are not zero expenses; the recorded difference is not confirmed disposable income.",
      );
    paragraph(
      "The Folio Credit Index is a deterministic 0-100 experimental scorecard, with higher values representing stronger assessed financial capacity under this model. It is not a bureau score, probability of default, loan offer or lending decision. No traditional credit score is required or used. Evidence confidence is separate from the index.",
    );
    heading("Reproducible methodology");
    paragraph(
      `Model ${a.model}. Capacity contributes up to 50 points: 50 x clamp((income - expenses) / income / 0.4). Liquidity contributes up to 30 points: 30 x clamp(closing liquid balance / average monthly expenses / 3). Cycle resilience contributes up to 20 points: 20 x clamp(minimum month-end balance / average monthly expenses). Clamp each ratio to 0-1, sum the contributions, then round once to the nearest integer. Developer-chosen weights are hypotheses, not coefficients learned from repayment outcomes.`,
    );
    if (p.disclosure?.cashflow === false)
      paragraph(
        "Cash-flow inputs were withheld by the issuer. This recipient cannot independently reproduce the factor values from the report alone.",
      );
    paragraph(
      "Ordinary profiles require at least 90 days and three complete months. Seasonal profiles require two complete years. Missing required coverage, classifications, obligations or balance evidence produces an unscored result, not a zero. Calculation uses exact minor units for observed amounts and one currency at a time. Transfers and borrowing are excluded from income; refunds offset expenses.",
    );
    heading("Disclosure and limitations");
    paragraph(p.limitations);
    paragraph(
      "This immutable passport represents the selected input revision, not a live account. Optional cash-flow figures and factor details may be withheld; model, coverage, evidence confidence and limitations always remain. Sharing can expire or be revoked through Folio. Revocation stops future service access and cannot recall a downloaded copy.",
    );
    heading("Source and model record");
    if (p.apiProvenance)
      paragraph(
        `Nessie live API read: ${p.apiProvenance.readAt}. ${p.apiProvenance.records} normalized records across ${p.apiProvenance.accounts} accounts. ${p.apiProvenance.note}`,
      );
    paragraph(
      `Snapshot ${p.id}\nSource: ${p.source}\nGenerated: ${p.generatedAt}\nFinancial identity and raw merchant histories are excluded from this report.`,
    );
    const range = d.bufferedPageRange();
    for (let n = 0; n < range.count; n++) {
      d.switchToPage(n);
      d.fillColor(muted)
        .font("Inter")
        .fontSize(8)
        .text(
          `Folio | Experimental assessment | ${n + 1} / ${range.count}`,
          48,
          d.page.height - 62,
          { width: 499, align: "center", lineBreak: false },
        );
    }
    d.end();
  });
}
