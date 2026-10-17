# Completed Claude review: d8471a69fb7e2dbb16060586b39d71184384ec8e
The original CLI report completed successfully before iCloud recovery. It reviewed an immutable export with Read/Glob/Grep only, and did not execute tests. The original full JSON remains in the Documents repository; its in-progress empty container copy was removed here. These are Codex's verified dispositions, not a replacement claim of raw JSON evidence.

- F1 P1 server/gemini.ts: PDF extraction lost record_type/linked_record_id and could count bill plus payment twice. Accepted; structured extraction now preserves both through CSV normalization, with page/date/amount tests.
- F2 P1 server/store.ts: local interrupted deletion could leave tombstone incomplete. Accepted; SQLite startup completes those markers (no aggregate refresh needed); regression added.
- F3 P2 server/app.ts: old assessments missing monthly data were recomputed without persistence. Accepted; GET state now saves the compatibility migration transactionally.
- F4 P2 server/assessment.ts: inactive-only months differed from PG monthly contract. Accepted; month list comes from active rows; regression added.
- F5 P2 server/ai-routes.ts: in-memory AI limiter is per-process. Recorded limitation: current single-process server; database-scoped provider limits added for multi-replica correctness in next repair checkpoint.
- F6 P2 server/passport-pdf.ts: disclose that hidden cash-flow inputs prevent independent reproduction. Accepted; methodology explicitly marks withheld inputs.
- F7 P3 server/store.ts: redundant local state read. Accepted and removed.
- F8 P3 server/nessie.ts: a bill's existence alone implied obligations complete. Accepted; Nessie leaves obligation coverage undocumented, requiring supplemental evidence and abstaining.

Reviewer unavailable checks reflect its source-only context, not Codex's separate successful local Timescale/PDF/browser execution. Live Auth0/Nessie/Gemini verification still needs credentials. Recovered-source repairs are reviewed against a new exact commit.
