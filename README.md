# Folio
Credit beyond your credit history. An experimental, explainable alternative assessment from permissioned financial activity, with a portable financial passport. No existing credit score required; no lender acceptance or predictive repayment validity is claimed.

## Local setup
Node 22.17+ is required. The application uses Next.js App Router with a co-hosted Express API. Tiger Data/Postgres is the connected source of truth; an explicit SQLite adapter supports service-free synthetic demos. A configured database failure never silently switches storage.

```sh
npm ci
cp .env.example .env.local # only if it does not already exist
# Enter configuration in the local editor; never paste secrets into chat or Git.
npm run dev
# http://localhost:3100 (port 3000 is used by another local application)
```

See [configuration and secret entry](docs/configuration.md), [original requirements](docs/requirements.md), [assessment contract](docs/assessment.md), [completion tracker](docs/completion.md), and [shared project brief](docs/project-brief.md). External provider credentials are not required for the labeled synthetic demo.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e # production-mode browser server on port 3101
```

Optional local TimescaleDB: `docker compose up -d`; then use `DATABASE_URL=postgresql://folio:local-development-only@127.0.0.1:5433/folio npm run db:migrate`. This is a local development password, not a production secret. To run database integration tests, set `FOLIO_TEST_DATABASE_URL` to that local URI when running `npm test`.

## Two-agent workflow
Codex in this chat is the sole builder and coordinator. Claude Code is the sole independent reviewer. Both read docs/project-brief.md and docs/assessment.md; reviewers receive immutable exports of exact Git commits. Continue this chat or, after stopping it, use `npm run builder`.

```sh
env -u ANTHROPIC_API_KEY npm run review -- HEAD
```

This machine's API-key balance was exhausted; the process-local override selects its existing Claude Pro login. Review tools are restricted to Read/Glob/Grep with no shell, edits, subagents, hooks or MCP servers. These are supported CLI tool permissions, not an OS sandbox. Results are saved in `reviews/<commit>.json`. A second simultaneous review is refused. `npm run review -- HEAD <session_id>` resumes a saved review with new source context while using its original conversation directory; if temporary directories were cleaned up, start a fresh review. Only the parent shell writes review output.

The initial workflow cycle is recorded in [reviews/CYCLE.md](reviews/CYCLE.md). New product checkpoints include their own reviewed commit and finding dispositions. Only assign Claude independent implementation in a separate `codex/claude-<task>` worktree after defining owned files and acceptance criteria; no parallel worker has been used.

## Status
This repository is being completed against the original brief. Adapter implementation, software tests and actual live-provider verification are tracked separately in docs/completion.md. Do not treat a local synthetic demo as production readiness. Auth0 tenant configuration, Tiger Cloud, Nessie and Gemini live smoke checks require external configuration. All fonts are self-hosted through Fontsource and use SIL OFL; SVG identity is original Folio work. AI assistance is disclosed in review and demo documentation.

## Product handoff

The full borrower demo now includes record review/correction, inspectable assessment drivers, evidence explanations, conditional scenarios, disclosure previews, two-page PDF export, expiring recipient links, revocation and deletion. All five US/Kenya fixtures remain clearly synthetic. For private uploads and real provider requests, enter the consolidated configuration through the ignored local file; actual Auth0/Nessie/Gemini smoke checks remain external requirements.

This checkout's `.env.local` uses the running local Timescale database. For a fresh service-free rehearsal, leave DATABASE_URL absent in your own local environment; no external credentials are required. Do not replace an existing environment file. To generate samples/persist fixed seeds: `npm run db:seed`. To rehearse a production build: `npm run build && npm start`.

Documentation: [requirement completion](docs/completion.md), [architecture](docs/architecture.md), [imports](docs/imports.md), [evaluation](docs/evaluation.md), [visual specification](docs/visual-spec.md), [verification](docs/verification.md), [deployment/runbook](docs/deployment.md), [demo scripts](docs/demo.md), [actual sponsor map and credits](docs/sponsor-map.md). `npm run providers:check`, `npm run eval:ai` and `npm run db:benchmark` produce ignored inspectable evidence under output/verification. Browser screenshots are under output/screenshots and test-results; sample PDF is output/pdf/folio-demo-passport.pdf.
