# Configuration and secret entry
Edit the ignored `.env.local` on this computer. It is created with owner-only filesystem permissions; never paste secrets into chat, commit them, or put them in browser-prefixed environment variables. Restart `npm run dev` after changes. `npm run providers:check` reports capabilities without printing credentials. Configure the production host's secret/environment editor for deployment.

| Capability | Environment variables | Setup |
|---|---|---|
| Canonical app URL | `APP_URL` | `http://localhost:3100` locally; actual HTTPS URL in production. |
| Signed authentication session | `SESSION_SECRET` | Random 32-byte secret generated locally. Preserve it across restarts; rotate on compromise. |
| Tiger Data | `DATABASE_URL` | Create a Tiger Cloud service, copy its PostgreSQL connection URI including TLS settings, then run `npm run db:migrate`. No silent fallback when this URL is set and the database fails. |
| Auth0 accounts | `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | Create a Regular Web Application in Auth0. Set callback `<APP_URL>/callback`, logout `<APP_URL>/`, and web origin `<APP_URL>`. Enable desired Universal Login connections. Use the tenant/custom-domain HTTPS issuer URL. |
| Nessie simulation | `NESSIE_API_KEY`, `NESSIE_BASE_URL`, `NESSIE_CUSTOMER_ID` | Obtain a Nessie developer key; use the service base verified by its current docs (current public site references `https://prod-api.nessieisreal.com`). Scope this application to a dedicated synthetic customer ID. API behavior must pass the smoke check before claiming live connectivity. |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` | Create a key in Google AI Studio, confirm its data-processing settings for the intended data, and choose a model available to that key. The check script lists accessible models and validates the configured model. Do not use real financial documents until provider processing and retention are appropriate. |

Demo mode needs none of the external variables. It uses a separate synthetic identity and a local SQLite adapter if DATABASE_URL is absent. Authenticated owner data is never implicitly copied into demo profiles or sent to providers by selecting a demo. No provider failure is silently replaced with synthetic results.

Docker Desktop was installed but its daemon was initially stopped. A local TimescaleDB Compose service is supplied for migration and query verification; Tiger Cloud itself remains an external dependency until configured.

This checkout now points DATABASE_URL at the running local Docker Timescale service on127.0.0.1:5433. Existing SQLite workspaces were copied with db:copy-local; the SQLite file remains intact. This is local Timescale verification, not a Tiger Cloud credential or deployment.

For the sandbox seed, create/select a dedicated synthetic customer in Nessie's developer tools and enter its ID locally. `npm run nessie:seed` shows a no-write plan; `npm run nessie:seed -- --apply` creates only marked synthetic accounts/deposits and skips existing markers. The seed deliberately does not manufacture complete statement coverage. Optional purchase/transfer feed capabilities must be checked against the active deployment.

After adding credentials locally, restart Folio, run providers:check, then complete the actual authenticated owner journey and live Gemini extraction/classification/evaluation. The status command never asks you to paste a key into chat. SESSION_SECRET already exists in this checkout; preserve it. The remaining missing values are AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, NESSIE_API_KEY, NESSIE_CUSTOMER_ID, GEMINI_API_KEY and GEMINI_MODEL; Tiger Cloud DATABASE_URL is only needed for cloud verification instead of local Timescale.
