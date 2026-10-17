# Verified delivery evidence

Latest application graphics source is **5c10407c90e91102c4938d0d540f58186ea1e3fd**, with the strengthened test checkpoint **cde6da887fe82a82d9e07d040c33d70d4b1b51c6** independently reviewed by **Claude Opus 5.5**. Full browser suite16/16; four affected cases reran successfully with native swipe and explicit zero-month assertions; both axe reports contain zero violations. See [graphics checkpoint](checkpoint-graphics.md) and `output/verification/graphics-manifest.json`. Earlier [UI checkpoint](checkpoint-ui.md) and manifests remain historical.

The provider/architecture baseline below was reviewed at **8cc031f85ea5fbda5abc86dacf376cb7d32b4db1**. Provider/migration/access findings and repairs are in reviews/PRODUCT-CYCLE.md and per-commit reports. Live-provider evidence was not regenerated for the UI refinement.

| Check | Actual result | Local evidence / reproduction |
|---|---|---|
| Unit/API/database |44 passed,0 failed,0 skipped, with real Tiger Cloud tests enabled; pure/API fixture tests remain isolated |output/verification/unit-tests.tap; npm run test:database |
| Full browser journey |14 passed across desktop/mobile at7074ddb; final cleanup-only profile-switch check2/2 at8cc031f |browser-results.json, profile-switch-results.json; npm run test:e2e |
| Build/static checks |Production build, typecheck and lint pass |build.log; npm run build, npm run typecheck, npm run lint |
| Tiger cutover |221 owners/workspaces,10710 transactions,235 assessment revisions,61 shares,214 sessions; source preserved |database-transfer.json; db:transfer, docs/database-transfer.md |
| Actual app restart |Two production process restarts preserve correction71→70 and income5050000→5040000 minor units, immutable earlier passport, sessions and revocation; separate session denied passport/share |app-persistence.json; npm run verify:persistence |
| Nessie |Real dedicated synthetic customer/account and six movements; optional transfers unavailable and reported |provider-status.json, provider-smoke.json; providers:check, providers:smoke |
| Gemini |Actual configured gemini-3.1-flash-lite explanation and PDF requests;2/2 synthetic PDF rows match date/amount/category, page refs and reconciliation |provider-smoke.json; providers:smoke |
| Live UI sponsor journey |Real Nessie→review→USD12600 recorded income→Gemini→Tiger Cloud→unscored sandbox passport; no fixture replacement |live-browser.json; desktop-live-* / mobile-live-* screenshots |
| AI evaluation |5/5 profile explanations,4/4 classifications,3/3 question scenarios; prompt folio-evidence-v3 |ai-evaluation.json, ai-classification.json; eval:ai (optional -- --classification-only) |
| Cash-flow SQL |Ten sequential actual network refresh-plus-monthly reads per profile; medians204–211ms, maxima244–1042ms |query-measurements.json; db:benchmark; no concurrency/speedup claim |
| Visuals/PDF |Desktop/mobile main states,1440/768/390/320 widths, keyboard/overflow/axe checks; rendered scored, limited and live Nessie PDF pages inspected |output/screenshots; output/pdf; nessie-live-passport.pdf |
| Secrets |.env.local and local CA ignored; environment mode600; no configured secret values in tracked files |git check-ignore .env.local; local scan performed without printing values |

Artifacts remain ignored local outputs; manifest.json records60 baseline paths with refreshed hashes/source attribution for changed UI captures. ui-manifest.json records the latest UI checks and captures; manifest.pre-ui.json preserves the previous baseline hashes. Screenshots and tiny synthetic evaluations do not certify accessibility, user acceptance, repayment prediction or production readiness. Prior quota/timeouts/unsupported-evidence failures were retained in local logs and drove schema/latency/recovery changes.

Remaining external acceptance is explicit: Auth0 tenant login/callback/logout and private upload journeys with two real accounts; intended HTTPS deployment/public repository; human eligibility, category/winning clarification and Devpost submission. Nessie sandbox and saved synthetic data are labeled distinctly. The free Tiger service is pinned under user-approved trust on first use, not a publicly trusted certificate chain.
