import { mkdirSync, writeFileSync } from "node:fs";
import { demoState } from "../server/workspace.js";
import { assess } from "../server/assessment.js";
import { snapshot } from "../server/passports.js";
import { passportPdf } from "../server/passport-pdf.js";
mkdirSync("output/pdf", { recursive: true });
mkdirSync("tmp/pdfs", { recursive: true });
for (const profile of ["newcomer", "limited"]) {
  const state = demoState(profile);
  state.connected = true;
  state.assessment = assess(state.borrower, state.revision);
  const report = snapshot(state);
  writeFileSync(
    profile === "newcomer"
      ? "output/pdf/folio-demo-passport.pdf"
      : "tmp/pdfs/limited-passport.pdf",
    await passportPdf(report),
  );
}
console.log("Synthetic passport PDFs generated for visual inspection.");
