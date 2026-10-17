# Verification commands and evidence

Run from the repository root. Node22.17+ and installed Playwright Chromium required (`npx playwright install chromium` if absent).

```sh
npm ci
docker compose up -d
npm run db:migrate
npm run db:seed
npm run typecheck
npm run lint
npm run test:database # uses configured DATABASE_URL without exposing it
npm run build
npm run test:e2e
npm run export:demo
npm run providers:check
npm run providers:smoke
npm run eval:ai
npm run verify:persistence
npm run db:benchmark
```

Do not rebuild while production browser servers run. The test runner uses3101 for the actual application and3102 for an isolated trusted-identity factory; production server/index.ts never imports tests/owner-server.ts. The Auth0 browser login remains an external tenant check. No test must spoof production authentication to satisfy that claim.

Screenshots: output/screenshots contains landing1440/768/390/320, source consent, record correction, settings and 200%-reflow-equivalent assessment. Browser journey tests also capture scored/unscored assessments and shared passports under test-results. Final copies and source revision metadata are recorded after the final build. PDFs: output/pdf/folio-demo-passport.pdf (synthetic scored), tmp/pdfs/limited-passport.pdf (unscored inspection). Render with pdftoppm; inspect each page, not just the PDF header. Unscored source needs should fit without clipping or unintended blank pages.

Source review is separate from execution: reviews/<commit>.json records Claude's source-only findings for immutable git exports. reviews/*dispositions.md records independently verified repairs and any rejected recommendations. Code execution results come from Codex's checks, not Claude. Do not attribute test execution to the read-only reviewer.

Current cloud verification: source transfer report database-transfer.json; actual production process restart report app-persistence.json; live sponsor/browser journey live-browser.json; provider-smoke.json separates raw ingest, fixture-only review, Gemini and PDF outcomes; ai-evaluation.json records each live quality result. Prior timed-out runs and quota failures remain in local logs and are described in evaluation.md. Final product/test commits, counts and artifact hashes are recorded in PRODUCT-CYCLE.md and output/verification/manifest.json.
