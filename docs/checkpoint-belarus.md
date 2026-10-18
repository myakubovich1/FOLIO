# Belarus demonstration market

Market implementation: **fa2485e124e302f2be6b7c66bfb05f3aef5afa7d**. Final UI/copy refinement: **93fffaa**. Documentation and captured evidence are committed afterward.

The user selected Belarus/BYN for the second demonstration market. Current UI selectors, names, profile context, typed contracts, validation, Gemini extraction schema, generated CSVs, assessment market IDs, evaluation expectations, README, demonstration script, completion/category checklist and Devpost draft reflect that selection.

## Financial consistency

- Ales Kavalenka is the synthetic seasonal farmer; Sviatlana Ivanova is the synthetic merchant. Records, balances and returned-deposit examples use consistent integer BYN minor units.
- Values are illustrative local-currency fixtures, not converted balances, current financial statistics or a claimed exchange rate. Farmer receipts are BYN 5,400 four times over two years; merchant receipts are BYN 1,400 per month.
- The BYN 1 returned-deposit correction changes farmer income from BYN 21,601 to BYN 21,600, and merchant income from BYN 16,801 to BYN 16,800. It increments the revision. Their ratios retain rounded indices 85 and 56; recalculation does not promise a change to the rounded number.
- The formula is unchanged. New market ID is `by-demo`; USD remains `us-demo`. Currency validation agrees across context, imports and Gemini extraction. Unsupported assessment currencies abstain instead of acquiring another market's ID.
- Nessie remains a USD banking sandbox and explicitly refuses a BYN workspace before a provider request. No live Belarusian bank integration is claimed.

## Verification

| Check | Result |
|---|---|
| Financial/API/database | **46/46 passed**, zero skipped; includes actual Tiger Data tests, BYN transfer totals, checked-in CSV reconciliation, passports/shares/PDF and immutable earlier snapshots |
| Additional extraction check | **2/2 passed** after adding exact BYN structured-extraction assertions |
| Full browser regression at `fa2485e` | **24/24 passed**, desktop and mobile; all profile currencies/scores, Belarus entry/owner setup, Nessie refusal, correction, sharing/revocation and existing access boundaries |
| Final selected-market refinement | **2/2 affected cases passed** after the final build; recorded in `output/verification/belarus-manifest.json`; selected and hovered hero contrast is checked with axe |
| Static checks | TypeScript, ESLint and optimized production build pass |
| Actual passport export | Corrected farmer PDF renders index 85, BYN 21,600 income, BYN 14,400 expenses and BYN 7,200 residual; extracted text and rendered page inspected |
| Independent reviewer | Actual Claude Opus5.5, read-only immutable source exports; Codex executed checks |

Initial review found no P0–P2 issues and suggested explaining the small correction's unchanged rounded score. That behavior is now explicit in the demo/evaluation documentation. Screenshot inspection also caught the existing selected-market hover contrast issue; the selector specificity is repaired and covered by the focused axe check.

The initial review is preserved verbatim [in Git at `93fffaa`](https://github.com/myakubovich1/FOLIO/blob/93fffaa/reviews/fa2485e124e302f2be6b7c66bfb05f3aef5afa7d-followup.json). Its working-tree copy was archived to keep obsolete market wording out of the current product tree. The much older review also has a Git archive pointer; no historical reviewer statement has been relabelled as certifying the new configuration.

## Existing data and reproduction

Issued snapshots and their shares retain their original values and enforcement. Retired-market demo sessions receive a clear fresh-start message and the current profile picker; the underlying records are preserved. This avoids changing the currency of an existing transaction or retroactively editing an issued report. New sessions always use the current catalog. Existing private records are never silently relabelled.

Start with `PORT=3100 APP_URL=http://localhost:3100 npm start`; choose **Belarus · BYN** on the landing preview, or select Ales/Sviatlana. Connect saved synthetic records, correct the returned deposit, inspect the assessment and generate a passport. Private-owner setup offers the same BYN selection. Auth0 tenant login remains pending; browser owner checks use the isolated trusted-identity harness.

Reproduce with `npm run lint`, `npm run build`, `npm run test:database`, `npm run test:e2e`. Stop FOLIO app/test processes before rebuilding. Provider calls are unnecessary for this market/configuration regression.

[Desktop Belarus assessment](images/belarus-assessment.png) · [Mobile Belarus assessment](images/mobile-belarus-assessment.png). Additional landing/passport captures and PDF are under ignored `output/`; their hashes and exact source references are recorded in the local manifest. Mobile checks use Chromium emulation, not a physical-device certification.

Final source review: [93fffaa report](../reviews/93fffaaa1c44c46a225b12cc814b0cfc35ef2782-followup.json). Claude confirmed the correction explanation, hover contrast, axe assertion and archive pointer. Its remaining documentation-spacing observation was verified and corrected afterward; application source is unchanged.
