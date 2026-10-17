#!/usr/bin/env bash
main() {
set -euo pipefail
cd "$(dirname "$0")/.."
commit=$(git rev-parse --verify "${1:-HEAD}^{commit}")
mkdir -p .workflow reviews
root=$PWD
lock="$root/.workflow/reviewer.lock"
# Refuse simultaneous reviewers. Trap cleans up only our own lock.
if ! mkdir "$lock" 2>/dev/null; then echo 'A reviewer is already running (or a stale .workflow/reviewer.lock needs inspection).' >&2; exit 1; fi
trap 'rmdir "$lock"' EXIT
snapshot=$(mktemp -d "${TMPDIR:-/tmp}/folio-review.XXXXXX")
git archive "$commit" | tar -x -C "$snapshot"
mkdir -p "$snapshot/.claude"
printf '{"mcpServers":{}}\n' > "$snapshot/empty-mcp.json"
prompt="$snapshot/review-prompt.txt"
{
 printf 'You are the sole Claude Code independent reviewer. Codex is the sole builder. Review stable commit %s. This is an immutable Git export, not the live checkout. Do not delegate or implement. Report P0/P1/P2/P3 findings with file:line, reproduction, impact and suggested fix. Review the implemented slice for financial correctness, inconsistent charts/figures, missing state handling, access control, confusing UX and mobile behavior. Report defects in the checkpoint scope. Missing external credentials block live smoke tests, not the independent implementation. Identify unimplemented requirements honestly. Do not claim tests ran. Read source files as needed with Read/Glob/Grep only.\n\nSHARED PROJECT BRIEF (explicitly supplied):\n' "$commit"
 git show "$commit:docs/project-brief.md"
 printf '\nASSESSMENT CONTRACT:\n'
 git show "$commit:docs/assessment.md"
 printf '\nRead src/contracts.ts, server/*.ts, src/main.tsx, src/style.css and tests/*.ts. Return actionable findings and checks not performed.\n'
 printf '\nCheckpoint focus: %s\n' "${FOLIO_REVIEW_FOCUS:-Review the current product checkpoint for correctness, financial explanations, UX and access boundaries.}"
 printf '\nCurrent source root: %s. Ignore any older source paths in conversation history.\n' "$snapshot"
 if [[ -n "${2:-}" ]]; then printf '\nThis is a focused follow-up to your completed review. Verify the prior findings and the specific repair/new-change scope supplied in Checkpoint focus above. Do not repeat the full requirements review. Return at most five actionable findings, or confirm the scoped repairs by source inspection. Keep the response concise; no test execution is available.\n'; fi
} > "$prompt"
out="$PWD/reviews/$commit.json"
claude_args=(-p --effort "${FOLIO_REVIEW_EFFORT:-low}" --permission-mode dontAsk --tools Read,Glob,Grep --allowedTools Read,Glob,Grep --disallowedTools Bash,Edit,Write,Agent,Task,NotebookEdit --disable-slash-commands --setting-sources '' --strict-mcp-config --mcp-config "$snapshot/empty-mcp.json" --settings '{"disableAllHooks":true}' --output-format json)
session_cwd="$snapshot"
if [[ -n "${2:-}" ]]; then
  if [[ ! "$2" =~ ^[a-f0-9-]{36}$ ]] || [[ ! -f "$root/.workflow/sessions/$2.cwd" ]]; then echo 'No saved reviewer directory for that session. Run a fresh review without the session ID.' >&2; exit 1; fi
  session_cwd=$(cat "$root/.workflow/sessions/$2.cwd")
  if [[ ! -d "$session_cwd" ]]; then echo 'The old review directory was cleaned up. Run a fresh review without the session ID.' >&2; exit 1; fi
  claude_args+=(--resume "$2" --add-dir "$snapshot")
  out="$root/reviews/$commit-followup.json"
fi
# This installed Claude version scopes resume lookup to its original working directory.
cd "$session_cwd"
# Available tools, not just preapproved tools, are restricted. No Bash/Edit/Write/Agent/MCP.
claude "${claude_args[@]}" < "$prompt" > "$out"
node --input-type=module - "$out" "$root" "$session_cwd" <<'JS'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const result=JSON.parse(readFileSync(process.argv[2],'utf8'));
if(result.is_error||result.subtype!=='success'){console.error(result.result||'Claude review failed');process.exit(1)}
mkdirSync(`${process.argv[3]}/.workflow/sessions`,{recursive:true});
writeFileSync(`${process.argv[3]}/.workflow/sessions/${result.session_id}.cwd`,process.argv[4]);
console.log(result.result);
JS
printf 'Review output: %s\nImmutable input: %s\n' "$out" "$snapshot"
}
main "$@"
