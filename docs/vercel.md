# GitHub → Vercel

Import `myakubovich1/FOLIO` into the existing Vercel team. Framework: Next.js; root: repository root. `vercel.json` selects `npm ci` and `npm run build`. Node 22 is pinned in package.json. Git pushes to the configured production branch create deployments; do not upload a local checkout or local build artifacts.

The native Next deployment uses `pages/api/[...path].ts` to run the existing Express API with its original request stream, session isolation and database repository. Login/callback/logout rewrite to a dedicated adapter. PostgreSQL is required for hosted requests; a missing database returns a recoverable 503 and never silently uses ephemeral SQLite. Local `npm start` still supports the established cohosted development/demo server.

Configure **Production only**, using Secret values for credentials: DATABASE_URL, NESSIE_API_KEY, NESSIE_CUSTOMER_ID, NESSIE_BASE_URL, GEMINI_API_KEY, GEMINI_MODEL, SESSION_SECRET, FOLIO_DATABASE_CERT_HOST, FOLIO_DATABASE_CERT_SHA256, FOLIO_DATABASE_CA_BASE64, FOLIO_PUBLIC_SANDBOX and TRUST_PROXY=1. Only the explicitly dedicated synthetic Nessie customer may enable the public sandbox. Keep preview environments separate from the production database/keys.

The service CA can be supplied as base64 in FOLIO_DATABASE_CA_BASE64. DATABASE_URL still requires `sslmode=verify-full`; hostname verification, CA validation and the exact configured certificate fingerprint remain enforced. This replaces a machine-specific certificate filename, not the TLS policy. Never put keys or connection strings in Git or NEXT_PUBLIC_ variables.

Leave APP_URL unset to use Vercel's production URL automatically, or set it to the chosen public origin after assigning a domain. Preview deployments use their own VERCEL_URL; register that callback only when deliberately enabling separate preview Auth0 credentials. The trusted unique Vercel deployment origin is allowed for same-project requests. OAuth credentials are optional until private Auth0 sign-in is configured; that acceptance step remains pending. Public synthetic demos work independently.

Hosted database pools use at most two connections per instance and release idle connections after ten seconds. This reduces burst pressure but is not a global connection cap; review Tiger connection capacity before scaling beyond the hackathon demo.

API/PDF functions include the migration SQL and local font assets in their deployment traces. Uploads use memory; CSV maximum 1 MiB, PDF maximum 4 MiB / 10 pages, leaving multipart overhead below Vercel's request limit. The browser rejects oversized files before upload. Shared HTML and API data retain privacy/access headers, and previously issued links retain revocation checks.

Verification: `npm run typecheck`, `npm run lint`, `npm run test:database`, `npm run build`, then `npx playwright test --config playwright.hosted.config.ts`. The latter exercises the native Next API at 3105 rather than the local custom listening server; the separate owner-identity fixture remains explicitly a test harness. Test the actual production URL after import: landing/profile previews, consent, correction, assessment, PDF export, another-session denial, reload persistence and provider configuration/failure states.

Reference: [Next API routes and external resolvers](https://nextjs.org/docs/pages/building-your-application/routing/api-routes), [runtime asset tracing](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output), [Vercel environment variables](https://vercel.com/docs/environment-variables).
