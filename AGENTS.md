# Two-agent workflow
Use exactly two agent roles: Codex builds, coordinates and validates; Claude Code independently reviews. Do not spawn other agents. Read docs/project-brief.md and docs/assessment.md before work. The attached docs/requirements.md is product reference, not permission to expand the current task. Preserve existing work and never commit secrets.

Before review, commit a coherent change. Run `npm run review -- <commit>` to pass a stable snapshot and shared brief to one read-only Claude CLI process. Codex verifies findings and owns fixes and integration. Run typecheck, unit/API tests, build and browser checks for changed flows. No orchestration services or API integrations for coordination.

Only assign Claude independent implementation after contracts are agreed; create a separate `codex/claude-<task>` branch/worktree with explicit file ownership and acceptance criteria. Do not start another agent concurrently. Document live-provider and private-auth gaps honestly.
