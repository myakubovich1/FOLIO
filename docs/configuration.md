# Configuration and secret entry

Active ignored file: `/Users/myakubovich/Projects/FOLIO/.env.local`, mode600. Edit locally and save to disk. Never paste secrets into chat, commit them, or prefix them with NEXT_PUBLIC_. Restart the backend after changes. Config is explicitly loaded by server/config.ts for both the custom server and scripts.

| Capability | Variables | Setup / current state |
|---|---|---|
| App | APP_URL, PORT | localhost:3100 locally; actual HTTPS origin for deployment. |
| Session | SESSION_SECRET | Random private secret; preserve across restarts. Already configured locally. |
| Tiger Cloud | DATABASE_URL | Full PostgreSQL URI including password and TLS. Configured and verified with real reads/writes, cutover and two production app restarts. No silent fallback. |
| Demo TLS pin | FOLIO_DATABASE_CERT_HOST, FOLIO_DATABASE_CERT_SHA256; sslrootcert in DATABASE_URL | User-approved trust on first use for the free synthetic service. Local public CA file is `.data/certs/tiger-demo-ca.pem`. verify-full, normal hostname/CA verification and exact leaf SHA256 are all required. Host mismatch on the primary database stops startup. Certificate rotation requires deliberate verification and pin update. This is not public-CA attestation; use a standard publicly trusted service for private-data deployment. |
| One-time migration | FOLIO_SOURCE_DATABASE_URL or FOLIO_SOURCE_SQLITE_PATH | Source retained unchanged. `db:transfer` takes a consistent read-only snapshot and atomically copies missing owners/history/share state. Never clear deletion guards to revive stale data. See database-transfer.md. |
| Nessie | NESSIE_API_KEY, NESSIE_BASE_URL, NESSIE_CUSTOMER_ID | Configured. Base is https://prod-api.nessieisreal.com. Dedicated synthetic customer and idempotent six-movement seed verified. `nessie:setup -- --apply` can bootstrap a customer from a key. |
| Gemini | GEMINI_API_KEY, GEMINI_MODEL | Configured as gemini-3.1-flash-lite after real PDF generation succeeded. Both actual explanation/UI and extraction calls have succeeded. Actual availability/quota is checked separately; 3.8 Flash's daily free-tier allowance was exhausted during verification. Never silently switch models or fabricate success. |
| Auth0 | AUTH0_ISSUER_BASE_URL, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET | **Still pending.** Create a Regular Web Application; callback `<APP_URL>/callback`, logout `<APP_URL>/`, web origin `<APP_URL>`. Use tenant HTTPS issuer and preserve SESSION_SECRET. Exercise actual login/callback/logout with two accounts. |
| Public synthetic sandbox | FOLIO_PUBLIC_SANDBOX | Defaults false; this local judge demo explicitly enables it for the dedicated synthetic Nessie customer only. Private owner sources remain authenticated. |
| Proxy | TRUST_PROXY | Enable only behind the intended trusted reverse proxy; defaults off. |

Use the deployment host's secret editor for hosting. The local certificate's absolute path must be provisioned appropriately on another host; do not copy this machine's path blindly. Inspect `providers:check`, `providers:smoke`, `eval:ai` and `verify:persistence` outputs after setup. Discovery alone is not generation, and the test identity adapter is not Auth0 login.

Each Store serializes local writes/refreshes. Cross-replica Timescale refreshes share a session advisory lock, holding one connection per refreshing instance. Pool ceiling is five per Store; size deployment connection limits for every instance and lock wait. Multi-replica load capacity is unbenchmarked.
