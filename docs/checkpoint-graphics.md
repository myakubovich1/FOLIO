# Financial graphics checkpoint

Application source: **5c10407c90e91102c4938d0d540f58186ea1e3fd**. Final strengthened tests and Opus review: **cde6da887fe82a82d9e07d040c33d70d4b1b51c6**. The application code is unchanged between these commits. Running at http://localhost:3100.

## What changed

- Original editable SVG illustrations for records → review → financial passport, in coordinated green, warm-neutral and blue cards. Decorative art contains no fabricated financial figures or verification marks.
- A circular index visual repeats the actual 0–100 integer. Missing evidence uses an unfilled dashed ring and an em dash, never a zero. Evidence confidence remains separate. Flat arc ends preserve proportions.
- Factor icons and bars show earned points against each labelled factor maximum. The passport preview/recipient view uses the same permitted values and a decorative globe emblem. Hidden disclosures remain hidden.
- A more detailed cash-flow chart with a common zero baseline, axis guides, exact monthly inspector, click/touch selection, arrow/Home/End navigation and exact accessible descriptions. Income excludes transfers/borrowing; gross spending and refunds remain separate.
- Analytics must match the current assessment month by month before being drawn. Stale or empty mismatches retain the deterministic summary and offer **Refresh assessment**; unavailable analytics offer **Retry analytics**. The source caption resets correctly.

No assessment formula, provider configuration, account boundary or PDF renderer changed. Existing PDF export is exercised by the browser regression journey; this is not a claim that the new SVG art is embedded in the PDF.

## Checks and evidence

| Check | Result / exact checkpoint |
|---|---|
| Unit/API/database | **44/44**, none skipped, real Tiger Cloud tests enabled, at f773672 |
| Full desktop/mobile browser suite | **16/16** at 5c10407: borrower correction/assessment/passport/PDF/sharing/revocation; private-owner harness; provider recovery; responsive/keyboard/a11y; stale/503/empty analytics recovery |
| Strengthened cases | **4/4** at cde6da8: native CDP touch gestures expose the last month before tapping; explicit zero-income farmer month; all rendered bar heights compared with server figures; exact accessible descriptions |
| Visual checks | 1440/768/390/320 CSS pixels and 720px reflow approximation; zero axe violations in both suites; reduced-motion rules preserved |
| Static/build | Typecheck, lint, optimized production build pass |
| Independent review | Actual **claude-opus-5-5**, read-only CLI source review of stable Git exports. All accepted findings fixed; final scoped review reports no defects |

The full suite ran before strengthening the two affected tests; the four affected cases then passed with the added assertions. These are not four additional unique product scenarios. Mobile evidence uses Chromium touch emulation, not a physical device. Automated/semantic accessibility checks do not certify complete screen-reader behavior or WCAG compliance.

## Claude findings and disposition

1. The reported scored-with-unknown/out-of-coverage reproduction is prevented by the assessment validation and existing abstention tests. We verified that boundary, made the missing-evidence warning explicit, and added month-by-month analytics reconciliation to guard stale data.
2. Fixed stale backend attribution on fallback; reset the caption and ignore aborted callbacks.
3. Removed rounded ring caps that overstated tiny values.
4. Removed the duplicate live announcement; each month has its own stable exact-value description. Added rendered geometry checks and an explicit seasonal zero-month requirement.
5. Separated assessment refresh from analytics retry, with a tested mismatch → refresh → 503 → retry → empty → refresh → matching lifecycle.
6. Strengthened touch verification: overflow/out-of-view preconditions, actual native browser gestures, visible target assertion before tap.

Reports: `reviews/f773672a986f3dfda28280eb4d4e752500fe3cd5.json`, `reviews/cf9db084de92698eca06fc5f337d30eab3062cb4-followup.json`, `reviews/5c10407c90e91102c4938d0d540f58186ea1e3fd-followup.json`, `reviews/cde6da887fe82a82d9e07d040c33d70d4b1b51c6-followup.json`. Claude inspected source; Codex executed checks.

The initial Opus call was rejected because global Claude Code2.1.116 was too old. An ignored local installation of official CLI2.1.302 resolved it. No global installation or project runtime dependency was changed. Actual model usage is recorded in each successful review JSON. The optional isolated-model command is in README.

## Screenshots and reproduction

`output/screenshots/desktop-journey-infographic.png` and the matching mobile image show the illustrated steps. Desktop/mobile `cashflow-infographic`, `factor-infographic` and `passport-graphic` images show actual saved synthetic freelancer data; cash-flow captions confirm the Tiger/Timescale query. Main `landing-viewport`, `assessment-viewport` and `sharing-viewport` images are refreshed too. Component captures hide the fixed navigation overlay; full viewport captures retain it.

`output/verification/graphics-manifest.json` records source revisions, outcomes and SHA256 hashes. Earlier UI/provider manifests are historical; current graphics evidence does not claim fresh Nessie/Gemini execution. No additional provider quota was spent on this UI work.

Reproduce with `npm run typecheck`, `npm run lint`, `npm run test:database`, `npm run build` and `npm run test:e2e`. Stop FOLIO app/test servers before rebuilding Next assets. Resume the app with `PORT=3100 APP_URL=http://localhost:3100 npm start`. Existing Auth0/public deployment acceptance gaps are unchanged.
