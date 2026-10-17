# Build Folio: alternative credit scoring for people without traditional credit histories

Act as the lead product engineer and product designer. Implement this brief in the current repository and carry it through to a working, tested application. Read the repository instructions and existing code first. Preserve a suitable existing stack; use the defaults below when starting fresh. Make reasonable implementation decisions and continue working. Ask for missing information only when it blocks a material requirement.

## 1. Product and outcome

Build **Folio**, a polished alternative credit-scoring platform for people whose creditworthiness is poorly represented or unavailable through traditional credit-bureau models. The product must work without requiring an existing credit score, a credit card, a prior bank loan, or years of bureau-reported borrowing.

**The core proposition: assess a person's ability to manage and repay financial obligations using permissioned evidence of their actual financial activity, even when they have no conventional credit history.**

Serve both the **United States** and **emerging markets**. In the US, design for newcomers without a US credit file, young adults and other first-time borrowers, gig workers, and people with limited bureau records. In emerging markets, design for informal merchants, seasonal earners, farmers, and others whose activity is recorded through bank accounts, mobile money, payments, invoices, or household bills. These are target users, not risk categories.

The scoring engine is the central product. A financial passport is the portable, borrower-controlled report that communicates its result, evidence, and uncertainty to a potential lender. Structure the product as an alternative assessment pathway that participating lenders could evaluate and adopt. Lender acceptance must never be implied without an actual participating institution.

The complete journey is:

**Choose or connect records → review and correct the interpretation → receive an explainable alternative credit assessment → inspect the score and supporting evidence → generate a portable credit report → share it securely → manage or revoke access.**

Serve multiple borrower types through distinct, realistic demo profiles. The owner is the main user. A recipient can open a deliberately limited, read-only passport without creating a lender account.

The underlying problem is the mismatch between a person's financial activity and what traditional credit files capture. Do not describe entire countries as lacking financial institutions, and do not frame this as a product only for poorer countries. Financial exclusion from thin or unavailable credit records is the shared problem. Use digital records where present and explicit, corroborated documentation where available. Be clear about missing cash activity; bank transactions cannot reconstruct an entirely cash-only livelihood.

Finish the actual workflows, integrations, persistence, permission controls, error handling, responsive design, and verification. Every visible action must have useful implemented behavior. Financial numbers must come from the data pipeline. Marketing copy, charts, and generated explanations must agree with the underlying records.

**UI and UX are first-class deliverables.** Apply the visual system and interaction design from the first working flow. Give the design requirements below the same implementation attention as the scoring engine; the product should feel intentionally designed across the landing page, onboarding, application, shared report and exported PDF.

Implement a real, versioned scoring engine and a lender-readable alternative credit assessment. The first shipped model may be an explicitly experimental, transparent scorecard. Distinguish a functioning alternative score from demonstrated predictive validity: a claim about default probability, superior accuracy, fairness, or lender adoption requires the relevant real-world evidence. The software must work completely; model validation status must be stated truthfully.

## 2. Competition strategy

Build for SwampHacks XII. Check the current official rules before submission. The rules permit one specialized track and multiple challenges. Select **Best Use of AI/ML** as the specialized track.

| Target | Demonstrable contribution |
| --- | --- |
| Best Overall | A complete alternative credit-assessment journey spanning US and emerging-market users |
| Capital One: Best Use of Nessie | Working sandbox ingestion across relevant financial resources |
| Best Use of AI/ML | A central, evaluated evidence-understanding pipeline |
| Best Use of Gemini API | Working structured extraction and evidence-backed explanations |
| Best Use of Tiger Data | Persistent transaction history and time-series analytics used by the app |
| Easy On the Eyes: UI/UX | A distinctive, accessible and exceptionally clear borrower journey |

Auth0 can support an additional challenge through real authentication. GoDaddy or Vultr are optional if they naturally fit delivery. Do not expand scope merely to add sponsor names. Entertainment & Creative Technology is not a generic originality award. Do not claim eligibility for unrelated tracks.

Prepare a three-minute live demo and a separate video script of at most two minutes. Include an accessible repository, a useful README, dependency credits, and honest disclosure of AI assistance. Keep event work within the permitted development window.

## 3. UI and UX: strongly Wise-inspired, thoroughly designed

### 3.1 Visual reference and priority

Use **https://wise.com/** as the main visual reference. Recreate its combination of energetic green, dark green typography, oversized confident headlines, rounded actions, generous whitespace and clear financial information hierarchy in a Folio-specific product. The desired resemblance should be immediately visible in the palette, typography scale and component treatment. Apple is a secondary reference for interaction polish, not the primary visual direction.

Build Folio's own identity, copy, credit-assessment screens and logo. Keep the product clearly named Folio throughout. Use the actual green palette below rather than the muted approximations in an early concept. Study the current public reference before implementation; if a design-documentation URL is unavailable, continue using the live site and this specification.

### 3.2 Color system

The following core colors were checked against Wise's publicly served website styles. Additional semantic and neutral colors are Folio implementation choices. Centralize all colors as semantic CSS variables and theme tokens.

| Role | Color | Application |
| --- | --- | --- |
| Bright green | `#9FE870` | Primary actions, selected emphasis and major brand moments |
| Forest green | `#163300` | Headlines, primary-button text, wordmark and dark sections |
| Pale green | `#E2F6D5` | Quiet emphasis, selected backgrounds and informational surfaces |
| Main text | `#0E0F0C` | Primary body copy and numerical values |
| Secondary text | `#454745` | Supporting explanations and field descriptions |
| White | `#FFFFFF` | Main canvas, forms and report surfaces |
| Soft canvas | `#F4F6F0` | Subtle application background |
| Border | `#DCE2D5` | Dividers and quiet container outlines |
| Error text | `#B3261E` | Actual validation errors and destructive confirmations |
| Error surface | `#FBEAE8` | Supporting error backgrounds |
| Caution text | `#8A4B00` | Important unresolved evidence |
| Caution surface | `#FFF3D6` | Supporting caution backgrounds |

Use forest text on bright green. Keep ordinary reading surfaces predominantly white or softly tinted. Include a purposeful forest-green marketing section with bright-green or white type. Do not interpret the brand's green as proof that a borrower has a favorable score: financial status must have explicit labels and data-defined semantics. An unscored result should feel calm and actionable rather than look like failure.

### 3.3 Typography, spacing and geometry

Use **Inter** for body copy and interface text. For the heavy display treatment, use **Inter Tight at 800–900** as the default available alternative to Wise's own display typeface. Self-host or load the chosen fonts reliably, include their license information, and provide good system fallbacks.

Use approximately 80–104 px desktop hero headlines, 42–56 px mobile hero headlines, 32–40 px page titles, 20–24 px section titles, and 16–18 px body text. Large display text can have tight spacing and a compact line height; forms and financial explanations need comfortable line heights. Keep ordinary labels at a readable size. Use tabular numerals for amounts and score breakdowns.

Use an 8 px spacing rhythm with a small 4 px adjustment step. Start with a 1200 px content maximum, 40–48 px desktop page gutters, 20 px mobile gutters, 24–32 px between major components, and 24–32 px card padding. Use roughly 16–24 px card radii and fully rounded primary actions. Keep thin borders and low, occasional shadows. Establish consistent alignment before adding decoration.

### 3.4 Original logo with the same confident energy

Design an **original Folio symbol and wordmark** inspired by the confidence, compact geometry and sense of movement of Wise's branding.

Use a bold geometric **F** built from two overlapping document-like forms or folded planes, with a small forward inclination or upward cut suggesting progress and a portable financial record. Give it a distinct silhouette and legible negative space. Pair it with a sturdy, tightly composed Folio wordmark. This should read as Folio at small sizes, with its own construction rather than a redrawn Wise flag or altered Wise lettering.

Deliver editable SVG assets, a reusable logo component, a symbol-only favicon and monochrome variants. Support forest-on-white, forest-on-bright-green and bright-green-on-forest applications. Check the symbol at 16, 24 and 32 px. Specify clear space and minimum size. Keep it crisp, flat and useful as an app icon; a stock shield, globe, sparkle or generic bank icon is not the logo concept.

### 3.5 Landing page composition

Create a purposeful marketing page with a compact header: Folio identity, “How it works,” “Your data,” “Log in,” and the primary action **“Build your profile.”** Use a simple mobile menu that preserves a visible start action.

Use this original hero direction:

**“Credit beyond your credit history.”**

Supporting copy should explain alternative credit scoring from existing financial activity and explicitly state that an existing score is not required. Pair **“Build your profile”** with a quieter **“Explore demo”** action. Limit the text width and control line breaks at desktop and mobile sizes.

Pair the hero with an attractive **working assessment preview**. Let visitors switch between a US and an emerging-market demo profile. Fetch the displayed score and evidence summary from the actual synthetic dataset; show its demo and experimental-model labels. The preview should lead into the corresponding working journey, not behave as a static marketing screenshot.

Follow with three clear steps, a concise audience section, an explanation of source permissions and corrections, and a final forest-green call-to-action section. Use original graphics or real interface previews where helpful. Keep the information hierarchy strong enough that the purpose and next action are clear within the first viewport. Include honest methodology and privacy information in the footer. Customer counts, partnerships, testimonials and certifications require actual evidence.

### 3.6 Application layout and score experience

Use a clean desktop shell with a roughly 224 px navigation rail, a restrained top bar and a spacious main area. Main destinations are Overview, Records, Assessment, Report and Settings. On mobile, use a simple four-destination navigation with Assessment accessible from Overview; keep the assistant contextual.

On Overview, lead with the **Folio Credit Index** and its interpretation, the data period, experimental model label and a separate evidence-confidence summary. Make “Understand your score” obvious. Show one useful cash-flow chart and a short “What drives your result” section before secondary metrics. Keep score drivers inspectable rather than using an oversized speedometer or decorative credit-card mockup.

Open a factor into a useful explanation with its contribution and linked evidence. Use a side panel on wide screens and a dedicated view or accessible full-screen sheet on phones. A visitor should be able to trace a material score reason to its supporting records in a small number of clear steps. Explain missing evidence beside the affected result, with a direct route to resolve it.

### 3.7 Guided onboarding and record review

Use four understandable stages: **Your context → Add records → Review → Your assessment**. Ask only for information needed at that stage. Preserve completed inputs, support Back and resuming, and explain the selected source and consent scope before processing. Do not require an existing score or a particular occupation to proceed.

Make source selection, uploading and correcting records feel straightforward. Show accepted file types, example files and size limits before upload. Provide real processing stages, a useful preview and explicit recovery actions. Large unfamiliar forms, repeated financial questions and unexplained disabled buttons are design defects.

The review workspace should use a readable table on desktop and intentionally designed rows on mobile. Provide useful search and filters, aligned currency amounts, source labels, grouping where helpful, and a clear unresolved-items queue. An ambiguous income classification needs a concise explanation and a confirm/correct action. Retain the user's place after a correction and visibly update the relevant assessment revision.

### 3.8 Assistant, scenarios and portable reports

Present the evidence assistant as an integrated explanation tool beside the score or record being inspected. Offer context-relevant questions, inspectable citations, a clear streaming or pending state and recovery from a failed request. It should never cover important controls or become a generic floating chatbot that dominates the application.

Keep the scenario explorer focused: a small number of understandable financial adjustments, the resulting model calculation and a readable explanation of what changed. Clearly distinguish a scenario from the issued assessment.

Give the shared report the same identity and hierarchy as the owner view. Place the score, evidence confidence, model version and coverage prominently. Use well-designed disclosure controls and show the exact recipient preview before link creation. Revocation and expiry should be understandable actions with immediate feedback. Explain PDF persistence at the point of sharing.

Treat the exported PDF as a designed product surface: a restrained branded masthead, readable typography, aligned figures, clean page breaks, repeated table headers where necessary and a compact methodology section. Preserve all required score context. A browser screenshot pasted onto a page is not a finished export.

### 3.9 Components and interaction states

Create consistent reusable components for the header, navigation, primary and secondary buttons, form controls, source selector, progress stepper, upload preview, record rows, status labels, evidence references, score breakdown, dialogs, notifications and report preview.

Primary buttons should use the bright-green fill, forest text, a pill shape and approximately 48–56 px height. Secondary actions should be quieter. Show hover, pressed, focus, disabled, loading and success behavior. Inputs need persistent labels, contextual help and clear inline errors. Prefer one obvious primary action per stage. Reserve destructive emphasis for destructive actions.

Use brief motion around 150–220 ms for local feedback. Respect reduced motion. Preserve layout space for loading content and use stable skeletons where appropriate. Processing labels must correspond to actual work; do not simulate elapsed-time percentages. Prevent repeated submissions and preserve state if a request fails. Every empty or failure state must offer the next useful action.

### 3.10 Accessibility and language

Aim for WCAG 2.2 AA and report what was actually checked. Measure normal-text contrast, support keyboard access and visible focus, manage dialog focus, use semantic form labels, and announce asynchronous results appropriately. Prefer comfortable touch targets of at least 44 px. Do not rely on color alone. Provide an accessible table or text alternative to important charts.

Use sentence-case interface copy and direct action labels. Define unfamiliar financial terms in place. Show currency units, reporting periods, account context and missing coverage explicitly. Keep primary financial information legible at 200% zoom and narrow widths. A calm “More evidence needed” state should explain exactly what can be added without presenting the person as a financial failure.

### 3.11 Visual completion criteria

Create `docs/visual-spec.md` documenting tokens, typography, layout rules, logo construction and important component states. Apply the same system to authentication entry/return screens, the application, the public recipient view and PDF output wherever those surfaces are under the app's control.

Inspect the working landing page, onboarding, scored overview, unscored overview, record review, sharing flow and report at approximately 390 px, 768 px and 1440 px widths. Check narrow 320 px layouts as well. Fix accidental horizontal overflow, awkward line wrapping, clipped menus, inconsistent radii, poor numeric alignment, weak contrast and unexplained dead ends. Check keyboard and zoom behavior.

Assess whether a first-time visitor can identify the product, its main action and the next step without coaching; label a heuristic review honestly if no user testing occurred. Finish with a deliberate visual pass after the full data flow works. Completion requires a coherent, polished experience across the journey, not merely a styled homepage followed by default application components.

## 4. Default architecture

For a new repository, use:

- Next.js App Router with TypeScript.
- Tailwind CSS with accessible component primitives, customized to the design system.
- Tiger Data PostgreSQL with TimescaleDB capabilities as the canonical database.
- An appropriate PostgreSQL driver and typed query layer or ORM that supports the required SQL migrations.
- Gemini through Google's current supported SDK for the AI features.
- Auth0 for owner authentication when its configuration is available.
- A suitable chart library, a unit-test runner, and browser-level end-to-end tests.

Verify current official documentation before implementing provider calls. Select compatible dependency versions and commit the lockfile. Keep database access, provider secrets, and financial computations on the server. Use a modular application rather than unnecessary microservices.

Organize boundaries around ingestion, normalization, financial metrics, the alternative credit-scoring engine, AI interpretation, portable reports, and access control. Keep calculation and scoring functions independently testable. Use server-side schema validation for requests and provider responses. Define a typed assessment result contract including model version, market configuration, financial feature values, score or abstention, reason codes, evidence confidence, missing inputs, and supporting source references.

Document environment variables including `DATABASE_URL`, `NESSIE_API_KEY`, `NESSIE_BASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, the required authentication configuration, and the canonical application URL. Provide an `.env.example` with placeholders, never secrets. Model identifiers must be configurable and checked against the credentials actually available.

Provide a reproducible local setup with migrations, seed commands, and an appropriate local database configuration. Support an explicitly labeled fixture mode for development and rehearsals. A live integration counts as complete only after a real request succeeds; missing credentials must be reported as a specific blocker rather than hidden behind a simulated success.

## 5. Demo profiles with meaningful differences

Implement these profiles with coherent, deterministic synthetic datasets:

| Profile | Financial history | What the experience should demonstrate |
| --- | --- | --- |
| US newcomer with no US credit file | About 12 months of USD bank activity and documented recurring payments | A person can receive an alternative assessment without prior US credit products; nationality and immigration status are excluded from scoring |
| US freelancer or gig worker | About 12 months of irregular USD client payments and ongoing living costs | Irregular pay timing can coexist with a meaningful cash buffer and an assessable financial profile |
| Seasonal farmer in an emerging-market demo | About 24 months, recurring production costs and harvest-related inflows | Assessment over the observed income cycle rather than treating every low-income month as financial failure |
| Small merchant in an emerging-market demo | About 12 months, frequent customer receipts, supplier payments and mobile-money-style records | Revenue, business spending and transfers can support an assessment without formal borrowing history |
| Limited evidence | About six weeks with missing periods or an incomplete source | An unscored, actionable result when evidence is insufficient; no credit history is not itself an adverse signal |

Give each profile an appropriate amount of varied activity. Mark the main demo borrowers as having no usable traditional bureau score. That condition must not reduce the alternative score or block the alternative assessment. Include refunds, duplicate imports, internal transfers, ambiguous descriptions, a correction opportunity, and at least one interesting question whose answer is supported by identifiable records.

All demo identities and records must be synthetic. Clearly distinguish **synthetic data** from **live API connectivity**: fetching synthetic records through a live Nessie request does not make them real personal financial records.

Implement two explicit demonstration market configurations: **United States / USD** and **Kenya / KES**, with the second chosen as a configurable example for the emerging-market story. Use appropriately identified synthetic CSV or PDF records for the KES examples. Nessie-backed records remain USD sandbox examples; never relabel them as Kenyan bank or mobile-money data. Do not claim a live local integration that has not been implemented.

Normalize currency-dependent values correctly and favor dimensionless financial ratios. Locale, source formats and payment calendars may differ; being in a particular country must not itself improve or worsen someone's score. Keep market-specific parameters explicit and versioned. Support a responsive interface on modest devices, clear upload progress and recovery from an interrupted upload. Design additional markets as configurations and source adapters, not a claim of universal readiness.

Provide public access to isolated synthetic demo sessions, with a simple profile selector. A profile switch must change every related chart, metric, transaction table, AI context, and passport. Public demo access must never expose private owner records or share tokens.

## 6. Sources and ingestion

### Nessie

Implement a working server-side Capital One Nessie adapter. Inspect the current resource schemas and available endpoints. Use accounts, purchases, merchants, deposits, withdrawals, transfers, and bills where supported and relevant. Incorporate loan records only when present and understood.

Provide an idempotent synthetic seed process and a real synchronization path. Record ingestion status, source identifiers, imported counts, timestamps, failures, and retry state. Use bounded retries for transient failures and preserve partial-failure information. Scope imported records to the correct owner and configured sandbox resources.

Persist a replayable snapshot for a dependable demo, with a visible “Saved demo data” state when used. Do not silently substitute fixtures for a failed live request. Avoid destructive resets of shared sandbox resources.

The UI must describe Nessie as a banking simulation. Do not create a pretend bank-credential form or label a sandbox selector as a real bank connection.

### CSV and statement upload

Implement a documented CSV format and a downloadable example that round-trips through the importer. Support a reviewable PDF-statement extraction path using Gemini as the second ingestion method. State supported formats and sensible size/page limits in the UI.

Normalize uploaded and API records into the same schema. Preserve source location, original values, currency, account context, and the distinction between extracted, user-confirmed, and source-recorded information. Allow structured evidence of rent, utilities, telecom payments, invoices and mobile-money transactions where the file supplies the necessary facts. Maintain distinct record types and coverage requirements; these are not automatically equivalent to a bank statement or verified loan-repayment record.

Show a preview with accepted rows, ambiguous rows, and actionable errors before import. Reconcile totals and opening/closing balances when the document supplies the necessary information. Failed reconciliation must remain visible. A receipt or statement that lacks income or account-coverage information must not be treated as a complete financial history.

Treat all uploaded text and transaction descriptions as untrusted data, including instructions embedded inside them. Configure provider processing appropriately before using real personal information; use synthetic files for the public demo. Process temporary uploads with a documented retention and cleanup policy.

## 7. Alternative credit model and financial interpretation

Build a deterministic, versioned credit-assessment service with an actual proprietary result: the **Folio Credit Index**, on a clearly labeled **0–100** scale, with higher values representing stronger assessed financial capacity under the stated model. Label the initial release **experimental scorecard v1**. Use an original scale and terminology rather than implying equivalence to FICO or another bureau score.

AI interprets messy inputs and explains results; application code calculates the financial figures, feature contributions and final index. An LLM must not invent the score, weights, default probability or a lender's decision.

Implement an explicit, documented initial scorecard with financially motivated features, normalization rules, input requirements and fixed weights. Developer-chosen weights are hypotheses, not coefficients learned from repayment outcomes. Put the configuration under version control and calculate the same result for the same inputs and model version. Document the complete formula before integrating the result into the interface, then implement it rather than stopping at a proposal.

Use factors such as residual cash-flow capacity after observed expenses and known obligations, liquidity relative to expenses, cycle-adjusted resilience, and observed payment performance when due dates and actual payments are sufficiently documented. Require consistent core inputs for a scored result. Define how optional factors are handled without silently making unlike feature sets look comparable. Never replace an unavailable obligation, balance or payment record with an assumed favorable value.

Return **two distinct outputs**: the alternative credit result and the evidence-confidence assessment. Missing or weakly supported information affects confidence and may require abstention; absence of a conventional credit file is not a negative scoring feature. Never equate data scarcity with evidence of nonpayment. Avoid a global borrower ranking across different source coverage or unvalidated market settings.

The result must include factor contributions, material positive and negative reason codes, observations that would change the result, and links to supporting records. Provide a small scenario explorer that recalculates the score from explicit changes to financial inputs. Label it as a conditional model calculation, not a promised future score or loan offer.

Model-validation status must be inspectable. Without outcome-labeled repayment data, report software correctness and synthetic behavior checks only. If suitable real labeled data are available and authorized, document lineage, population fit, temporal splits, calibration and relevant performance measures before making predictive claims. Keep the scoring interface replaceable so an empirically validated model can later use the same evidence and report pipeline.

Calculate, where the available evidence supports it:

- Observed coverage dates, gaps and source completeness.
- Monthly external income, actual expenses, net cash flow and rolling summaries.
- Recurring obligations with evidence and a confirmation state.
- Available liquid balance and reserve days when balance evidence is sufficient.
- Income concentration, variability and possible seasonal patterns.
- Explicit unknowns, unresolved classifications and the effect of corrections.

Define formulas, weights, transformations, period conventions, input requirements and rounding in `docs/assessment.md`. Separate observed facts from user declarations and model suggestions. Show the reporting period, data freshness, evidence confidence, validation status and limitations of connected coverage alongside the score. A reviewer must be able to reproduce a sample score manually from the documented feature values.

Use exact decimal or minor-unit arithmetic appropriate to the currency. Distinguish revenue from borrowing proceeds, gifts, refunds and transfers. Do not count internal transfers as income, count the same bill and payment twice, or count a credit-card repayment as a second copy of its underlying purchases. Cash withdrawals require an explicit treatment because the subsequent use of that cash may be unknown.

Preserve missing periods as missing. Do not fill absent records with zero income or claim that no debt exists because none was imported. Preserve date-only source dates without timezone shifts. Account for account type and transaction status.

Support both a scored state and an abstention state. A scored result shows the Folio Credit Index, contributions and evidence confidence. An abstention shows “More evidence needed” or “Clarification needed,” the actual missing requirements, and a useful next step. Do not display a zero or a red risk badge simply because a score cannot be produced. Fewer than 90 days of useful records should initially request more history; this is a documented product threshold, not an empirically validated lending rule. Seasonal scoring requires coverage appropriate to the declared cycle. Longer but incomplete records can still require abstention. A score is an input for a potential lender's evaluation, not an automatic approval or rejection.

Do not automatically penalize irregular income. Evaluate the seasonal profile over an appropriate observed cycle; insufficient cycles mean limited evidence for seasonality. Calendar regularity must not serve as a shortcut for occupation prestige or financial worth.

Allow users to state their occupation and income pattern. AI may suggest a broad pattern such as seasonal, contract-based, salary-like, mixed, or unknown, citing supporting records. Ask the user to confirm it. Use an evidence-supported cycle for the financial analysis, not a score bonus for a prestigious job title. Do not infer a person's moral character, reliability, or exact profession from the shops they visit.

Use financially relevant amounts and obligations. Do not derive sensitive personal traits from merchant names or use such inferred traits in an assessment. Exclude nationality, immigration status, ethnicity, religion, gender, occupation prestige and social-network characteristics from scoring. Keep unnecessary merchant-level details out of shared reports and AI explanations. With equivalent financial evidence, changing a name, nationality, job-title label or country label must not change the model score. Invariance tests can detect specific accidental dependencies; they do not establish general fairness or predictive validity.

For a future live lending deployment, document the intended lender relationship, allowed data sources, explanation requirements and validation needs for that actual market and use. Do not assert that a model or report is approved across jurisdictions or that any lender already accepts the Folio Credit Index.

## 8. Gemini as a central product capability

Implement a real evidence-understanding pipeline:

**Source records → structured extraction → reconciliation and validation → suggested classifications → user review → deterministic metrics → evidence bundle → Gemini explanation → output verification.**

Gemini must contribute substantial working functionality:

1. Extract statement records into a strict schema with source locations and explicit unknown fields.
2. Suggest transaction classifications and income-pattern interpretations with supporting record IDs and an abstention option.
3. Explain the computed alternative score, its factor contributions and its uncertainty in clear language, and answer questions about the person's own evidence.

Use structured output schemas and server-side validation. An output that passes JSON validation can still be wrong; check dates, amounts, record IDs, classifications, and reconciliation separately. A model's self-reported confidence is not a calibrated probability.

For explanations and Q&A, retrieve an authorized evidence bundle from Tiger Data. Supply typed, read-only tools for relevant metrics and records. Restrict every query by authenticated owner or the exact permitted snapshot. Explain which records support each material assertion, with links the owner can inspect.

Financial numbers in generated text must come from named calculation results or validated source values. Reject unsupported numbers, citations and conclusions; retry within a limit, then show a truthful retry or unavailable state. A cached explanation may be reused only for the same input revision and permissions, with an appropriate freshness indication.

Example useful questions: “How was my alternative score calculated?”, “Can I receive a score without a US credit history?”, “Why does my income look seasonal?”, “Which transfers were excluded?”, and “Which missing records prevent an assessment?” Questions about absent information should receive an explicit limitation rather than speculation. Explanations must match the deterministic score breakdown and must not promise approval, a rate or a lender's acceptance.

Minimize data sent to the model. Exclude unnecessary identity and sensitive merchant details. Keep prompts, model configuration, input revisions, and validated outputs versioned for debugging without logging raw personal financial data.

Gemini is the default provider. An OpenAI adapter is optional if there is a concrete benefit; do not build duplicate pipelines solely to list two model providers. Deterministic arithmetic, permission enforcement, and evidence validation remain outside either model.

## 9. Tiger Data as the source of truth

Persist owners, market configurations, source connections, consent, ingestion runs, accounts, source-record references, normalized transactions, corrections, scorecard versions, assessment revisions, feature contributions, reason codes, evidence-confidence results, evidence references, passport snapshots, share grants and operational audit events. Snapshot the exact scoring configuration used for each issued result.

Use a transaction hypertable where appropriate and implement time-bucketed cash-flow queries. Create at least one working continuous aggregate or equivalent supported TimescaleDB analytical feature that a real dashboard endpoint uses. Consult the current Tiger Data documentation for compatible SQL and extension behavior.

Design uniqueness and indexes to match TimescaleDB's partitioning constraints. A stable source-record registry or compatible composite key must make repeated ingestion safe. Corrections should preserve original source values and create traceable interpretation revisions.

Make new imports and corrections visible immediately through a bounded refresh strategy or a correctly combined recent-data query. Avoid stale aggregates, missing current buckets and double counting. Recompute affected assessments when inputs change. Completed passport snapshots remain versioned; the owner can issue an updated version and revoke an older share.

Filter every read, write and aggregate by owner and authorized scope. Deletion must cover derived data and aggregates as well as raw rows. Verify that deleted or revoked information cannot remain accessible through a snapshot route, cache or shared view.

Capture reproducible query measurements on the actual demo datasets. Report measured results and dataset sizes; do not invent a performance multiplier or load-test claim.

## 10. Required screens and behavior

Implement these connected surfaces:

1. **Entry page:** explicitly position Folio as alternative credit scoring for people without an established credit history, with US and emerging-market examples, a real start action, and an obvious synthetic-demo entry.
2. **Owner onboarding and sources:** authentication, informed source permission, sandbox selection or upload, progress, and recoverable errors.
3. **Review workspace:** searchable records, useful filters, classification explanations, correction controls and unresolved items.
4. **Overview:** the alternative credit index or abstention, separate evidence confidence, a useful cash-flow chart, source coverage and the next useful action.
5. **Assessment details:** exact factor contributions, reason codes, seasonal context, methodology and model version, missing evidence and inspectable supporting records. Include the conditional scenario explorer here.
6. **Evidence assistant:** focused explanations grounded in the current owner and input revision.
7. **Passport builder:** a real alternative-credit-report preview, configurable disclosure, generation of a versioned snapshot, PDF export, and link creation. Preserve the critical context necessary to interpret any included score.
8. **Shared passport:** an attractive, limited, read-only lender or other authorized recipient view, including the alternative score or abstention, factor summary, separate evidence confidence, model version, validation status, coverage, source type, generation date and limitations. The report is the financial passport; it is not an existing lender's decision.
9. **Settings and sharing:** source management, active links, expiry/revocation, and owner data deletion.

Each screen needs loading, empty, success, validation and failure states appropriate to its actions. Preserve user progress across refreshes. User-facing errors should explain the next action without exposing secrets or stack traces.

In the review workspace, changes must recompute the current assessment and invalidate stale AI text. Show what changed and why. Do not let an edited description overwrite the source record or silently turn a user declaration into verified evidence.

Passport export must produce a legible, well-formatted alternative credit report PDF with the same score, evidence confidence, figures and revision as the selected snapshot. It must have sensible page breaks, readable charts or tables, an appropriate explanation of methodology and validation status, and no accidental raw account details. A user may omit optional personal information but cannot strip uncertainty or the experimental model label while presenting the score as an official result.

## 11. Sharing, consent and access control

Use established authentication and server-side authorization. Public synthetic sessions and private owner data must be isolated. Test access control rather than relying on hidden UI controls or unguessable owner IDs.

Sharing must be deliberate. The owner previews exactly what the recipient will see, selects included sections and creates a link with an expiry. Default to a seven-day lifetime. Use high-entropy opaque tokens, store only their hashes, and support immediate revocation. Do not encode identity or financial information in the URL.

Render only the selected immutable passport snapshot, not the owner's live account. Include summary-level evidence by default; exclude raw merchant histories, full account identifiers and unnecessary identity fields. Check expiry and revocation on every access, including PDF download. Use appropriate cache controls, no-index directives and referrer handling. Avoid third-party analytics on token-bearing pages.

Explain that revocation stops future access through the service; it cannot recall a PDF someone already downloaded. Record operational access events without promising verified viewer identities or exact person-level view counts.

Provide meaningful consent controls for the actual processing performed. Disconnecting a source stops future ingestion. Owner deletion must revoke shares and remove or invalidate accessible derived records and files according to the stated retention policy. Do not claim immediate deletion from backups or external providers unless the implementation can establish that.

## 12. Evaluation and verification

Write tests that establish meaningful behavior, especially where money, private data or AI interpretation is involved.

Financial and ingestion checks must cover repeated import idempotency, internal transfers, refunds, borrowed funds, overlapping statement periods, duplicate bill/payment records, missing dates, decimal arithmetic, mixed-currency handling, incomplete history, and seasonal income. Verify corrections change only the appropriate calculations and revisions.

Scoring checks must include manually calculated expected results, exact factor contributions, reproducibility under a fixed model version, sensible monotonic behavior for controlled financial changes, abstention on missing required inputs, separation of confidence from risk, and no penalty for an absent traditional score. Compare financially equivalent histories expressed in different currency units or with different identity and occupation labels. Document which comparisons are valid for the configured market parameters. Verify a model-version change does not rewrite a previously issued report.

Use one currency per calculation or an explicitly documented conversion source and valuation date. The default is to keep currencies separate and explain the limitation.

Build a compact AI evaluation suite with human-authored expected fields and evidence references across the demo profiles. Include ambiguous income, misleading descriptions, malformed statements, nonexistent citations, unsupported numerical claims and prompt-injection text. Report extraction accuracy, classification correctness or abstention, evidence validity and numerical consistency separately. Synthetic tests do not establish real-world credit-risk accuracy. Record the model and prompt versions, and identify any evaluation that could not run against the live provider.

Browser-level checks must verify:

- Each US and emerging-market demo profile loads a consistent, distinct score or justified abstention without requiring a traditional credit file.
- An authenticated owner can import, review, correct, generate, export and share a passport.
- A permitted recipient can open the correct limited snapshot.
- A different owner cannot access private records or mutate another owner's share.
- Expired and revoked links fail, including after a previously successful visit and through PDF routes.
- New imports appear without stale aggregation errors.
- A provider failure produces a recoverable and honestly labeled state.
- Core flows work on mobile and desktop with keyboard navigation.

Inspect screenshots of the main owner journey, both important assessment states, the shared passport, and the PDF. Fix overflow, clipping, awkward spacing, misleading chart scales, unreadable contrast and broken interaction states. Run type checks, linting, relevant tests, and a production build. Run live-provider smoke checks when credentials exist and report any remaining blockers precisely.

## 13. Build order and completion discipline

Start by inspecting the repository and produce a brief implementation plan. Establish the visual tokens, Folio identity and main layout early, then implement and verify the first complete vertical flow using those components: one synthetic borrower with no traditional score, persisted records, an executable alternative scorecard, an explainable credit result, a portable report and authorized sharing. Extend the same architecture and design system to all profiles, market configurations, the live Nessie adapter, uploads and Gemini interpretation. Scoring, explanation and the Wise-inspired user experience are core acceptance requirements throughout the build.

Keep the scope centered on the agreed borrower journey. A lender application portal, real money movement, additional model providers, a lending marketplace, and unrelated sponsor features are outside this build. Spend the available effort on reliable completion of the chosen experience.

Do not stop at planning, scaffolding, a static dashboard, screenshots, or untested generated code. Continue until the acceptance criteria pass or a concrete external dependency blocks completion. Make the application useful with clearly labeled saved synthetic data while maintaining a precise distinction between that mode and verified live integrations.

If authentication or a paid provider needs human configuration, finish the independent implementation and verification first, then identify the exact missing configuration. Do not request secrets in chat or commit them. Do not bypass private-data authorization to make the demo appear complete.

Provide deployment configuration and a reproducible runbook. If a deployment is authorized and available, verify its complete journey at its real URL before reporting it as working.

## 14. Deliverables and definition of done

Deliver the working code, database migrations, deterministic seeds, sample import files, `.env.example`, useful scripts, original Folio SVG identity assets, and documentation covering setup, architecture, assessment methodology, visual specifications, evaluation and the demo.

Include a sponsor map showing the actual file paths, working user actions and evidence for each claimed integration. Include a three-minute live demo script and a separate two-minute video script. Open with a US borrower who has no usable traditional credit score and receives an explainable Folio result. Briefly switch to the emerging-market seasonal or merchant profile to demonstrate the same alternative pathway with different financial patterns. Inspect supporting evidence, make one meaningful correction, show the updated score and explanation, and share the resulting credit report. Prepare recipient access and revocation as a short follow-up. Any comparison with an unavailable traditional score must be explicitly illustrative; do not fabricate a real bureau lookup, rejection or competing score.

The build is complete when all of the following are true:

- The agreed journey works from entry through sharing and revocation.
- All five synthetic profiles have coherent records and distinct, correctly calculated alternative scores or justified abstentions across both demonstration markets.
- The Folio Credit Index is executable and reproducible, has a fully specified versioned formula, and displays its drivers separately from evidence confidence.
- Users can complete the assessment without a traditional score, prior loan, credit card, or nationality-based scoring feature.
- Real Nessie and Gemini requests succeed in the configured live environment, and Tiger Data actually persists and serves the application data.
- Missing or insufficient evidence remains visible and does not produce invented credit claims.
- Corrections, imports and current-period data propagate correctly through metrics and explanations.
- Owners, public demos and recipients have the correct access boundaries.
- The exported alternative credit report and shared snapshot match the selected scoring and assessment revisions, including their validation status and limitations.
- Core screens are responsive, accessible and visually inspected.
- The Wise-inspired palette, typography, spacing, actions and component system are consistently implemented across the entire user journey, shared report and PDF.
- Folio has an original, usable SVG symbol and wordmark, including small-size and monochrome variants.
- Required automated checks and the production build pass.
- Setup, credentials, tested behavior, measured performance and any remaining limitations are documented truthfully.

End with a concise handoff: what works, how to run it, verification performed, the actual integration status, and any specific remaining blocker. Never describe a blocked requirement as complete.

## Primary references to consult

- Main visual reference: https://wise.com/
- Wise design reference, where currently available: https://wise.design/
- Event site: https://xii.swamphacks.com/
- Official event prizes and requirements: https://swamphacks-xii.devpost.com/
- Official submission rules: https://swamphacks-xii.devpost.com/rules
- Nessie documentation: https://prod.nessieisreal.com/docs (verify the active base URL and account configuration; the event also references https://api.nessieisreal.com/)
- Gemini structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini document processing: https://ai.google.dev/gemini-api/docs/document-processing
- Tiger Data documentation: https://www.tigerdata.com/docs/
- Tiger Data hypertables: https://www.tigerdata.com/docs/reference/timescaledb/hypertables
- Tiger Data continuous aggregates: https://www.tigerdata.com/docs/reference/timescaledb/continuous-aggregates
- Background on cash-flow evidence and its limitations, not a validation of this product or advice about any particular jurisdiction: https://files.consumerfinance.gov/f/documents/cfpb_interagency-statement_alternative-data.pdf
- World Bank / ICCR credit-scoring methodology guidance: https://thedocs.worldbank.org/en/doc/935891585869698451-0130022020/original/CREDITSCORINGAPPROACHESGUIDELINESFINALWEB.pdf

Use current official provider documentation for implementation details. Record the SDK/API versions and event requirements actually verified during the build.
