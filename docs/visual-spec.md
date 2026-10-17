# Folio visual system

Direction: Wise-inspired clarity, high contrast, whitespace and confident green action, with an original Folio identity. No Wise assets or affiliation claims. Original symbol combines a page/folio silhouette with an ascending F. Symbol, 16px optical variant, outlined wordmark and monochrome variants are in public/brand; favicon is the small application entry. Keep at least half a symbol width clear space.

Self-hosted Inter 400–800 for interface and financial figures; Inter Tight 700/800/900 for large editorial headings. Fonts are SIL OFL, license files in public/licenses. Numerals align in tables. Auth0's externally hosted Universal Login remains tenant-controlled.

Tokens live in src/style.css: forest #163300, bright action green #9FE870, neutral white/off-white surfaces, dark body text and explicit semantic caution/error/success colors. Dark text on green provides readable contrast. Buttons use generous rounded geometry; cards have consistent borders and radius; primary actions describe a concrete next step. Source types, evidence confidence and limits remain readable alongside large scores.

Desktop: sticky header and left navigation, generous content column with responsive two-column score/evidence cards. Four consistent destinations (Overview, Records, Report, Settings) on every screen; assessment detail remains part of Overview with a back action. Mobile: stacked cards, four-destination bottom navigation with reserved page space, inline assessment actions, record cards instead of compressed table columns. Native modal evidence sheet manages focus, closes with Escape and returns focus to its trigger. Reduced-motion preference is respected. The monthly chart has a shared zero baseline/common scale, legend and exact accessible table; horizontal overflow is keyboard-focusable.

Required states: skeleton/processing announcements, source permission before action, empty search recovery, unscored next-evidence actions, explicit retry on network/provider errors, saved-correction notice, preview-before-issue, distinct issued revision, link expiry/revocation and typed destructive confirmation. UI language explains residual cash flow, missing evidence and experimental validation without requiring financial/technical knowledge.

Visual checks: browser screenshots at 1440, 768, 390, 320 CSS pixels; 720 CSS-pixel layout equivalent to a 1440px desktop at 200% zoom. This is a reflow approximation, not a claim that every browser's native zoom has been tested. Keyboard Space consent, modal Escape/focus and native control interaction are exercised. Axe checks WCAG A/AA tags on entry and assessment; automated checks and heuristic inspection do not establish complete WCAG certification or actual user research. PDF is separately rendered/inspected for pagination and matching figures.

## Wise-inspired refinement (October 2026)

The working synthetic demo is the primary landing action when private sign-in is unavailable. The preview uses a white financial card on a bright green stage, with clearer typography and shorter introductory copy. The dashboard pairs a forest index card with a neutral evidence panel; dates, history and source are grouped separately from the score. Connected overviews omit repeated setup steps. Original inline SVG icons replace platform-dependent glyphs.

Navigation moves keyboard focus to the new page heading and resets scroll instantly; surface entry uses a 220ms, 6px movement without fading text, and controls use 180ms feedback. All motion is disabled for reduced-motion preferences. The scored card has a contrasting lime keyboard focus ring. Loading indicators announce pending work without animating financial values.
