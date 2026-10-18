# Passport action and journey illustration polish

Source checkpoints: `5acb8bea1c30bd687eeddbcbdef4e4730e4fe749` removes public-link creation from the interface; `47b0c31c6a1a88013a92f6b2a85f2fde6ca4645a` adds distinct journey artwork and repairs historical-link error guidance. Both changes were explicitly requested by the user.

The passport screen keeps disclosure choices, preview, immutable issuance and PDF downloads. Link creation, lifetime, copy and URL controls are removed. The flow and current landing copy explain PDF export. Settings preserves revocation for previously issued links. Backend permissions and existing links remain intact; regression tests seed historical links through the API.

“Review meaning” now uses a clean pencil badge. “Understand it” has its own three-factor illustration and blue background. The SVGs are decorative and contain no invented financial values or verification badges. Browser coverage compares their actual SVG contents, tests keyboard/touch/reduced motion, and checks mobile overflow and axe accessibility.

Checks: TypeScript, lint and production builds pass. At `5acb8be`, all 46 financial/API/database cases pass (zero skipped) and 10 affected desktop/mobile browser cases pass, including actual PDF download and preserved historical recipient/revocation boundaries. At `47b0c31`, three relevant API cases and both affected journey browser cases pass. Desktop/mobile captures were visually inspected. This is focused regression evidence, not a claim that the entire browser suite was rerun after the artwork change.

Actual Claude Opus 5.5 performed read-only source reviews: [link-removal review](../reviews/5acb8bea1c30bd687eeddbcbdef4e4730e4fe749-followup.json), [artwork and repair review](../reviews/47b0c31c6a1a88013a92f6b2a85f2fde6ca4645a-followup.json). Its accepted error-message finding is fixed: unavailable historical links now ask for a passport PDF directly. Final scoped review reports no defects; Codex executed the checks.

[Review artwork](images/journey-review.png) · [Assessment artwork](images/journey-assessment.png). Additional mobile captures and test logs are in ignored `output/` and `.workflow/`. Historical checkpoint documents describe the interface at their exact source commits; current instructions are the PDF-export flow above.
