#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec codex --sandbox workspace-write "Read AGENTS.md, docs/project-brief.md, docs/assessment.md and reviews/CYCLE.md if present. You are the sole builder/coordinator. Continue the borrower-to-passport flow, preserve work, validate changes, commit a coherent change and request the sole Claude reviewer using npm run review -- HEAD. Do not start any additional Codex or other agents."
