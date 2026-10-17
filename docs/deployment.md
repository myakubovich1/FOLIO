# Runbook and deployment

Node 22.17+; Git; Docker Desktop for local Timescale. `npm ci`, preserve any existing .env.local, then follow configuration.md for local editor secret entry. This checkout uses port3100 because an unrelated local application uses 3000.

```sh
docker compose up -d
# Set DATABASE_URL in the ignored local file to the local dev URI from README,
# or the Tiger Cloud service URI with its required TLS settings.
npm run db:migrate
npm run db:seed
npm run dev
```

All five saved synthetic demos work with no external accounts. With DATABASE_URL unset, the explicitly labeled local SQLite adapter is used. Do not unset a failing configured database merely to make an integration appear connected. The app reports its adapter in Settings. Use `npm run db:copy-local` once to copy missing existing SQLite workspaces into configured Postgres; it preserves the SQLite source, skips existing/deleted destination owners and never restores their old shares. Back up the database before any production migration. Public demos create isolated copies; deterministic seed owners are not a bypass for private access.

Production on a Node/container host:

```sh
npm ci
npm run build
npm run db:migrate
HOST=0.0.0.0 npm start
# Or: docker build -t folio .
# docker run --env-file /secure/path/folio.env -p 3100:3100 folio
```

Use PostgreSQL/Tiger Data, HTTPS APP_URL, stable SESSION_SECRET and configured Auth0 tenant. The Docker build excludes all .env files and local data. Inject production secrets through the host's secret editor. Container startup uses the custom Next/Express server; Next standalone/serverless deployment is not appropriate. In Docker, the local host database URI must be replaced with an actual reachable service hostname (host.docker.internal on macOS, or a cloud/service hostname). Expose only the reverse proxy publicly. TRUST_PROXY=1 is appropriate only when requests can arrive solely through that trusted proxy. Provision extension/migration privileges deliberately; current app initialization performs idempotent schema setup. A managed production service may use a separate migration role and must validate runtime privilege needs before rollout.

Health: `/api/health` confirms application readiness and reports configured providers; configuration booleans are not live-verification claims. `npm run providers:check` verifies the configured database extension, Auth0 discovery, Nessie ingestion, and Gemini model access, without printing secrets. Discovery does not prove Auth0 callback login; listing a model does not prove generation/extraction. Run `npm run eval:ai` plus an actual synthetic PDF extraction, category review and evidence explanation before claiming Gemini works. See completion.md for unresolved live checks.

Tests: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:e2e`. Build must finish before browser production servers start; rebuilding .next underneath a running test server can invalidate bundles. Tests use3101, with a separate in-memory trusted-identity browser harness on3102. That harness is test-only and never imported by server/index.ts. `FOLIO_TEST_DATABASE_URL=<test-database-uri> npm test` runs the actual Timescale suite; ordinary tests otherwise mark it skipped. Do not use a customer production database for integration tests. `npm run db:benchmark` creates isolated synthetic measurement owners and deletes them afterward.

Recovery: database connection errors fail startup rather than silently switching storage. Provider errors retain saved financial records and allow retry/manual review. If deletion refresh is interrupted, a tombstone blocks access/recreation until startup completes aggregate cleanup. Revocation affects future requests, not already downloaded files. Define operator backup retention/deletion and provider-processing policy before real personal data. No public deployment URL was provisioned or verified in this local task.

If Timescale refresh is temporarily unavailable after deletion, the API still confirms raw/sharing removal and reports cleanupPending; the guard keeps aggregates inaccessible. A subsequent explicit fresh start retries bounded cleanup and returns a recoverable503 while it fails. It never force-clears the marker. Provider ceilings count logical operations per owner and hashed service key; each operation's retries are separately bounded.

The optional public-sandbox flag is for the dedicated synthetic Nessie customer only. Keep its default false for private-only deployments. This local judge demo enables it explicitly. Public source data is shared synthetic input, while each session's interpretations/reports are isolated. Gemini/Nessie keys remain server-only.
