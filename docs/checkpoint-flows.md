# Interactive borrower flows

Application and browser-test source: **6c3ff8ab058eb78c370b40e5b1182b8ea6c6a0e8**. Initial implementation: **f5dcd12f90d85ef7ab776c71891dd4000434ebcc**. Documentation and screenshots are committed afterward; they do not change application source.

## Delivered

- A four-step landing explorer with original SVG illustrations, useful explanations and a direct action into the selected synthetic demo.
- An assessment evidence flow backed by the current workspace: record count and source type, actual saved corrections and unresolved classifications, deterministic index or actual evidence gaps, and passport revision status. Source and passport actions navigate directly to their destinations.
- A sharing explorer that explains private records, immutable snapshots, optional recipient detail, active/revoked link counts, expiry and the limits of revocation. The preview state follows server loading, failure and retry. Unavailable factors are distinguished from an excluded disclosure.
- A contextual Overview next step. Issuance preserves the user's open recipient preview. Link copying has confirmation and a selected-input fallback when clipboard access is unavailable.
- Forest/lime/neutral styling, generous spacing, compact mobile grids in reading order, selected-state contrast, native focus, ordered tabs with Left/Right/Home/End, touch targets and reduced-motion support. Financial calculations, provider configuration, database schema and server access enforcement are unchanged.

## Checks

| Check | Evidence |
|---|---|
| Optimized build, TypeScript, lint | Pass at `6c3ff8a` |
| Financial/API/database regression | 44/44, zero skipped, real Tiger Cloud tests enabled, during initial f5dcd12 implementation; financial and server source unchanged by `6c3ff8a` |
| Full desktop/mobile browser suite | **22/22 passed** at `6c3ff8a`, including six new explorer cases; local log and screenshot hashes in `output/verification/flows-manifest.json` |
| Responsive and accessibility | 1440/768/390/320 CSS pixels, existing 720px reflow approximation, zero axe violations in tested states; mobile touch emulation and reduced-motion checks |
| New behavior | DOM/keyboard order; exact server score/gaps/counts; disclosure settings; unscored unavailable factors; preview focus/open persistence; clipboard success and failure; server revocation HTTP410; failed preview recovery |
| Independent source review | Actual `claude-opus-5-5`, read-only official CLI, immutable exports of f5dcd12 and `6c3ff8a`; Codex ran checks separately |

Reports: [initial review](../reviews/f5dcd12f90d85ef7ab776c71891dd4000434ebcc-followup.json) and [repair review](../reviews/6c3ff8ab058eb78c370b40e5b1182b8ea6c6a0e8-followup.json). No other agent processes were used.

## Review disposition

Claude found no P0–P2 defects and three P3 UX issues. All three were verified and repaired:

1. Replaced the mobile snake ordering with 1–2 / 3–4, so keyboard and reading order agree. The 2→3 connector points diagonally down-left; screenshot inspection confirms placement. Bounding-box assertions at 768/390/320 already guard the reading order, despite the final review suggesting they were absent.
2. A selected factor option with no available factors now reads **Not available** and explains why an unscored assessment has no factor breakdown. It cannot create financial evidence.
3. Recipient-preview expansion now has its own state; issuing the first snapshot preserves it. A browser assertion checks the open preview after issuance.

The first new-test run had incorrect expectations for reduced-motion duration and the HTML-shell response status, plus a selector that did not match the actual factor element. These test defects were corrected: zero animation, the actual `.report-factor` selector and the protected `/api/shared/<token>` endpoint. The full suite subsequently passed. The final independent scoped review reports all repairs in place and no new findings.

## Reproduce and inspect

Run `npm run lint`, `npm run build`, `npm run test:database`, and `npm run test:e2e`. Stop FOLIO app/test processes before rebuilding Next assets. Start with `PORT=3100 APP_URL=http://localhost:3100 npm start`. The [interactive demo walkthrough](demo.md#interactive-ux-walkthrough-no-new-provider-requests) reproduces the new interactions without consuming Nessie/Gemini quota.

Screenshots use corrected synthetic Alex records (index70) and no live account identity. [Desktop evidence flow](images/evidence-explorer.png), [mobile evidence flow](images/mobile-evidence-explorer.png), [desktop sharing](images/sharing-explorer.png), [mobile sharing](images/mobile-sharing-explorer.png). Component screenshots hide fixed navigation to avoid covering content; viewport images retain it. `output/screenshots/*-explorer.png`, `*-flow-viewport.png` and `*-overview-refined.png` have SHA256 entries in the local manifest.

This checkpoint does not certify physical-device or screen-reader behavior, complete WCAG compliance, public deployment, or Auth0 tenant login. Auth0 configuration remains pending. Existing actual Nessie/Gemini/Tiger evidence is preserved; no new provider success is claimed from these UI checks. Link counts describe the latest page update, while every server JSON/PDF request checks current expiry/revocation.
