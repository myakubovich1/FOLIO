# Foundation review disposition
Reviewed commit: 0c25ba85bf21e067b919cb73a6aad46e0699efeb. Claude report: same full-hash JSON. Codex independently checked each finding.

- P1-1 accepted: create/delete/mutate share one queue, PG owner advisory locks, tombstones prevent deleted-account implicit recreation. Concurrent delete/mutate regression added.
- P1-2 accepted: monthly numeric API contract on both adapters; excluded evidence rows persist as excluded status. Real local Timescale test exercises refresh and corrected income.
- P1-3 partly accepted: corrected currency-change guidance. Retaining historical records on disconnect is REQUIRED by original brief §11 (“Disconnecting a source stops future ingestion”). UI explicitly explains retention and whole-workspace deletion. Removing past records on disconnect would violate that contract.
- P2-1 accepted: upload/API boundary suite now checks share JSON and PDF inaccessible after owner deletion.
- P2-2 accepted: create only absent undeleted workspace; trim/cap trusted identity display name. Profile names edited in Folio are intentionally preserved across login.
- P2-3 accepted risk, different repair: serialize deletion and refresh, tombstone guards and workspace existence filter every cashflow query; crash recovery finishes pending refresh before explicit recreation. CALL runs after commit as supported by Timescale refresh procedure.
- P2-4 accepted: preview persistence moved into owner transaction queue.
- P3-1 accepted: PDF download controls now exposed for owner and permitted recipient.
- P3-2 accepted: aggregate query filters current workspace currency.
- P3-3 not changed: fixtures use deliberately fixed 2024/2025 dates for reproducibility, display exact coverage, never claim currentness. Relative dates would make expected results and sample hashes time-dependent.

Validation at repair: 21 unit/API/local Timescale checks passed; expanded regression suite runs at next checkpoint. Auth0 login, Tiger Cloud, Nessie and Gemini live calls remain configuration-dependent. Reviewer had source-only read access and did not execute tests.
