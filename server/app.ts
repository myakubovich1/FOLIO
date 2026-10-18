import express, { type Request } from "express";
import onHeaders from "on-headers";
import { auth } from "express-openid-connect";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Store, CleanupPendingError } from "./store.js";
import { registerNessie } from "./nessie-routes.js";
import { registerAI } from "./ai-routes.js";
import { snapshot } from "./passports.js";
import { passportPdf } from "./passport-pdf.js";
import { sampleCsv, minor } from "./imports.js";
import { registerUploads } from "./upload-routes.js";
import { assess } from "./assessment.js";
import { profiles, seed } from "./seeds.js";
import { demoState, ownerState } from "./workspace.js";
import { appUrl, configuredAuth, providerStatus } from "./config.js";
import type { State } from "../src/contracts.js";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const category = z.enum([
  "income",
  "expense",
  "transfer",
  "borrowing",
  "refund",
  "unknown",
]);
const cookie = (req: Request, name: string) =>
  req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`))
    ?.slice(name.length + 1);
export interface AppOptions {
  store?: Store;
  authenticate?: (req: Request) => { sub: string; name?: string } | undefined;
  authEnabled?: boolean;
}
export function createApp(dbPath = ":memory:", options: AppOptions = {}) {
  const store = options.store || new Store(dbPath);
  const ready = store.init();
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  const secure = appUrl().startsWith("https:");
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure,
    maxAge: 7 * 86400000,
    path: "/",
  };
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/shared"))
      onHeaders(res, function () {
        this.setHeader("Cache-Control", "no-store");
        this.setHeader("X-Robots-Tag", "noindex");
        this.setHeader("Referrer-Policy", "no-referrer");
      });
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });
  if (options.authEnabled !== false && configuredAuth())
    app.use(
      auth({
        authRequired: false,
        auth0Logout: true,
        afterCallback: async (_req, res, session) => {
          res.clearCookie("folio_mode", { path: "/" });
          return session;
        },
        baseURL: appUrl(),
        issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        secret: process.env.SESSION_SECRET,
        authorizationParams: {
          response_type: "code",
          scope: "openid profile email",
        },
        session: {
          rolling: true,
          absoluteDuration: 7 * 86400,
          rollingDuration: 86400,
          cookie: { httpOnly: true, sameSite: "Lax", secure },
        },
      }),
    );
  else
    app.get(["/login", "/callback", "/logout"], (_req, res) =>
      res.redirect("/?auth=unavailable"),
    );
  app.use("/api", async (_req, _res, next) => {
    await ready;
    next();
  });
  app.use(express.json({ limit: "256kb" }));
  const allowedOrigins = new Set([new URL(appUrl()).origin]);
  if (
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(new URL(appUrl()).hostname)
  ) {
    const u = new URL(appUrl());
    u.hostname = u.hostname === "localhost" ? "127.0.0.1" : "localhost";
    allowedOrigins.add(u.origin);
  }
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") &&
      !allowedOrigins.has(req.get("origin")!)
    ) {
      res.status(403).json({
        error: "This action must be made from the Folio application.",
      });
      return;
    }
    next();
  });
  const trustedUser = (req: Request) =>
    options.authenticate?.(req) ||
    (req.oidc?.isAuthenticated()
      ? {
          sub: req.oidc.user!.sub as string,
          name:
            typeof req.oidc.user!.given_name === "string"
              ? req.oidc.user!.given_name.trim().slice(0, 60)
              : undefined,
        }
      : undefined);
  const ownerId = (user: { sub: string }) =>
    `owner:${hash(`${process.env.AUTH0_ISSUER_BASE_URL || "test-issuer"}|${user.sub}`)}`;
  app.get("/api/health", (_req, res) =>
    res.json({
      ok: true,
      storage: store.pool ? "Tiger Data / PostgreSQL" : "local demo SQLite",
      providers: providerStatus(),
      publicSandbox: process.env.FOLIO_PUBLIC_SANDBOX === "true",
    }),
  );
  app.get("/api/identity", (req, res) => {
    const user = trustedUser(req);
    res.json({
      authenticated: Boolean(user),
      name: user?.name || "",
      mode:
        cookie(req, "folio_mode") === "demo" ? "demo" : user ? "owner" : "demo",
      authConfigured: configuredAuth(),
    });
  });
  app.get("/api/sample.csv", (req, res) => {
    const profile =
      typeof req.query.profile === "string" ? req.query.profile : "newcomer";
    if (!profiles.some((p) => p.id === profile)) {
      res.status(404).json({ error: "Example not found" });
      return;
    }
    res
      .type("text/csv")
      .attachment("folio-synthetic-example.csv")
      .send(sampleCsv(profile));
  });
  app.get("/api/profiles", (_req, res) =>
    res.json(
      profiles.map(({ id, name, context, currency }) => ({
        id,
        name,
        context,
        currency,
      })),
    ),
  );
  app.get("/api/preview/:profile", (req, res) => {
    if (!profiles.some((p) => p.id === req.params.profile)) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(
      assess({ ...seed(req.params.profile), sourceKind: "synthetic" }, 1),
    );
  });
  app.post("/api/session", async (req, res) => {
    const { profile } = z
      .object({
        profile: z.enum([
          "newcomer",
          "freelancer",
          "farmer",
          "merchant",
          "limited",
        ]),
      })
      .parse(req.body);
    const token = randomBytes(32).toString("base64url");
    const owner = `demo:${randomUUID()}`;
    const state = demoState(profile);
    await store.create(owner, state);
    await store.addSession(hash(token), owner);
    res.cookie("folio_session", token, cookieOptions);
    res.cookie("folio_mode", "demo", cookieOptions);
    res.json(state);
  });
  app.post("/api/owner/start", async (req, res) => {
    const user = trustedUser(req);
    if (!user) {
      res
        .status(401)
        .json({ error: "Sign in through Auth0 to open your private account." });
      return;
    }
    const owner = ownerId(user);
    await store.create(
      owner,
      ownerState(user.name?.trim().slice(0, 60) || undefined),
      true,
    );
    res.clearCookie("folio_mode", { path: "/" });
    res.json(await store.get(owner));
  });
  app.get("/api/shared/:token", async (req, res) => {
    const snapshot = await store.share(hash(req.params.token));
    if (!snapshot) {
      res.status(410).json({
        error:
          "This passport link is expired, revoked or unavailable. Ask its owner to send you the passport PDF directly.",
      });
      return;
    }
    res.json(snapshot);
  });
  app.get("/api/shared/:token/pdf", async (req, res) => {
    const snapshot = await store.share(hash(req.params.token));
    if (!snapshot) {
      res.status(410).json({
        error:
          "This passport link is expired, revoked or unavailable. Ask its owner to send you the passport PDF directly.",
      });
      return;
    }
    res
      .type("application/pdf")
      .attachment("folio-financial-passport.pdf")
      .send(await passportPdf(snapshot));
  });
  app.use("/api", async (req, res, next) => {
    const user = trustedUser(req);
    let owner: string | undefined;
    if (user && cookie(req, "folio_mode") !== "demo") {
      owner = ownerId(user);
      if (!(await store.get(owner)) && !(await store.isDeleted(owner)))
        await store.create(
          owner,
          ownerState(user.name?.trim().slice(0, 60) || undefined),
        );
    } else {
      const token = cookie(req, "folio_session");
      owner = token ? await store.session(hash(token)) : undefined;
    }
    if (!owner) {
      res.status(401).json({
        error:
          "Start a synthetic demo or sign in to continue. Your session may have expired.",
      });
      return;
    }
    const state = await store.get(owner);
    if (!state) {
      res.status(401).json({
        error: "Your workspace was deleted. Sign out and start again.",
      });
      return;
    }
    res.locals.owner = owner;
    res.locals.state = state;
    next();
  });
  app.get("/api/state", async (_req, res) => {
    let state: State = res.locals.state;
    if (
      state.mode === "demo" &&
      !["USD", "BYN"].includes(state.borrower.currency)
    ) {
      res.status(409).json({
        error:
          "This saved demo uses a retired market. Choose a fresh Belarus or United States profile. Your earlier issued passports remain unchanged.",
      });
      return;
    }
    if (state.assessment && !state.assessment.monthly) {
      const migrated = await store.mutate(res.locals.owner, (s) => {
        s.assessment = assess(s.borrower, s.revision);
      });
      state = migrated.state;
    }
    res.json(state);
  });
  app.post("/api/context", async (req, res) => {
    const context = z
      .object({
        name: z.string().trim().min(1).max(60),
        currency: z.enum(["USD", "BYN"]),
        incomePattern: z.enum([
          "salary-like",
          "contract-based",
          "seasonal",
          "mixed",
          "unknown",
        ]),
      })
      .parse(req.body);
    const current: State = res.locals.state;
    if (
      current.borrower.records.length &&
      current.borrower.currency !== context.currency
    ) {
      res.status(409).json({
        error:
          "Existing source records use a fixed currency. Choose another synthetic profile, or delete your private workspace data before changing currency. Disconnecting retains history.",
      });
      return;
    }
    const result = await store.mutate(res.locals.owner, (s) => {
      if (s.borrower.records.length && s.borrower.currency !== context.currency)
        throw new Error(
          "Delete the workspace data before changing the calculation currency. Disconnecting retains historical records.",
        );
      s.borrower.name = context.name;
      s.borrower.currency = context.currency;
      s.borrower.incomePattern = context.incomePattern;
      s.borrower.seasonal = context.incomePattern === "seasonal";
      s.borrower.context = `${context.currency === "USD" ? "United States" : "Belarus"} · ${context.incomePattern} income`;
      s.revision++;
      s.assessment = s.connected ? assess(s.borrower, s.revision) : null;
      delete s.explanation;
    });
    res.json(result.state);
  });
  app.post("/api/connect", async (req, res) => {
    z.object({ consent: z.literal(true) }).parse(req.body);
    const current: State = res.locals.state;
    if (current.mode === "owner") {
      res.status(403).json({
        error: "Use an upload or a configured source in your private account.",
      });
      return;
    }
    if (current.connected) {
      if (
        current.sources?.length === 1 &&
        current.sources[0].id === "saved-demo" &&
        current.borrower.sourceKind === "synthetic"
      ) {
        res.json(current);
        return;
      }
      res.status(409).json({
        error:
          "This workspace already uses a different source. Choose a fresh demo profile before connecting saved records; your current records and reports are preserved.",
      });
      return;
    }
    const result = await store.mutate(res.locals.owner, (s) => {
      if (
        s.connected &&
        (s.sources?.length !== 1 ||
          s.sources[0].id !== "saved-demo" ||
          s.borrower.sourceKind !== "synthetic")
      )
        throw Error(
          "Source changed. Start a fresh demo before switching evidence types.",
        );
      if (s.mode === "owner")
        throw new Error(
          "Choose an upload or a configured source for your private account.",
        );
      s.connected = true;
      s.sources = [
        {
          id: "saved-demo",
          kind: "synthetic",
          label: "Saved synthetic demo records",
          connected: true,
          consentedAt: new Date().toISOString(),
          coverageStart: s.borrower.start,
          coverageEnd: s.borrower.end,
          openingBalance: s.borrower.openingBalance,
          closingBalance: s.borrower.closingBalance,
          minimumBalance: s.borrower.minimumBalance,
          accountId: `synthetic-${s.borrower.id}`,
          accountType: "checking",
          complete: s.borrower.complete,
          obligationsDocumented: s.borrower.obligationsDocumented,
        },
      ];
      s.assessment = assess(s.borrower, s.revision);
    });
    res.json(result.state);
  });
  app.patch("/api/records/:id", async (req, res) => {
    const { category: nextCategory } = z.object({ category }).parse(req.body);
    const current: State = res.locals.state;
    if (!current.borrower.records.some((r) => r.id === req.params.id)) {
      res.status(404).json({ error: "Record not found." });
      return;
    }
    if (!current.connected) {
      res
        .status(409)
        .json({ error: "Add records before making a correction." });
      return;
    }
    const result = await store.mutate(res.locals.owner, (s) => {
      const record = s.borrower.records.find((r) => r.id === req.params.id)!;
      (s.corrections ??= []).push({
        recordId: record.id,
        before: record.category,
        after: nextCategory,
        revision: s.revision + 1,
        at: new Date().toISOString(),
      });
      record.category = nextCategory;
      record.interpretation = "user-confirmed";
      s.revision++;
      s.assessment = assess(s.borrower, s.revision);
      delete s.explanation;
    });
    res.json(result.state);
  });
  app.post("/api/passports/preview", (req, res) => {
    const { disclosure } = z
      .object({
        disclosure: z
          .object({ factors: z.boolean(), cashflow: z.boolean() })
          .default({ factors: true, cashflow: true }),
      })
      .parse(req.body || {});
    const state: State = res.locals.state;
    if (!state.assessment) {
      res.status(409).json({ error: "Add and review records first." });
      return;
    }
    res.json(snapshot(state, disclosure));
  });
  app.post("/api/passports", async (req, res) => {
    const { disclosure, expectedRevision } = z
      .object({
        expectedRevision: z.number().int().optional(),
        disclosure: z
          .object({ factors: z.boolean(), cashflow: z.boolean() })
          .default({ factors: true, cashflow: true }),
      })
      .parse(req.body || {});
    if (!res.locals.state.assessment) {
      res.status(409).json({
        error: "Add and review records before generating a passport.",
      });
      return;
    }
    if (
      expectedRevision !== undefined &&
      expectedRevision !== res.locals.state.revision
    ) {
      res.status(409).json({
        error:
          "Your records changed. Refresh the recipient preview before issuing a passport.",
      });
      return;
    }
    const result = await store.mutate(res.locals.owner, (s) => {
      if (expectedRevision !== undefined && expectedRevision !== s.revision)
        throw new Error("Records changed; refresh the preview.");
      const p = snapshot(s, disclosure);
      s.passports.unshift(p);
    });
    res.json(result.state);
  });
  app.get("/api/passports/:id/pdf", async (req, res) => {
    const snapshot = (res.locals.state as State).passports.find(
      (p) => p.id === req.params.id,
    );
    if (!snapshot) {
      res.status(404).json({ error: "Passport not found in this account." });
      return;
    }
    res
      .type("application/pdf")
      .attachment("folio-financial-passport.pdf")
      .send(await passportPdf(snapshot));
  });
  app.post("/api/shares", async (req, res) => {
    const { passportId, days } = z
      .object({
        passportId: z.string().uuid(),
        days: z.number().int().min(1).max(30).default(7),
      })
      .parse(req.body);
    if (
      !(res.locals.state as State).passports.some((p) => p.id === passportId)
    ) {
      res.status(404).json({ error: "Passport not found in this account." });
      return;
    }
    const token = randomBytes(32).toString("base64url");
    const result = await store.mutate(res.locals.owner, async (s, q) => {
      const p = s.passports.find((p) => p.id === passportId)!;
      const share = {
        id: randomUUID(),
        passportId,
        expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
        revoked: false,
      };
      await q(
        "INSERT INTO folio_shares(id,owner,hash,snapshot,expires) VALUES ($1,$2,$3,$4,$5)",
        [
          share.id,
          res.locals.owner,
          hash(token),
          JSON.stringify(p),
          Date.parse(share.expiresAt),
        ],
      );
      s.shares.unshift(share);
      await store.audit(res.locals.owner, "share-created", q);
    });
    res.json({ state: result.state, token });
  });
  app.delete("/api/shares/:id", async (req, res) => {
    if (
      !(res.locals.state as State).shares.some((s) => s.id === req.params.id)
    ) {
      res.status(404).json({ error: "Share not found." });
      return;
    }
    const result = await store.mutate(res.locals.owner, async (s, q) => {
      const sh = s.shares.find((sh) => sh.id === req.params.id)!;
      await q("UPDATE folio_shares SET revoked=1 WHERE id=$1 AND owner=$2", [
        sh.id,
        res.locals.owner,
      ]);
      sh.revoked = true;
      await store.audit(res.locals.owner, "share-revoked", q);
    });
    res.json(result.state);
  });
  app.get("/api/cashflow", async (_req, res) =>
    res.json(await store.cashflow(res.locals.owner)),
  );
  app.post("/api/scenario", (req, res) => {
    const { expenseReduction, balanceIncrease } = z
      .object({
        expenseReduction: z.number().int().min(0).max(50),
        balanceIncrease: z
          .union([z.string().transform((v) => minor(v)), z.number().int()])
          .pipe(z.number().int().min(0).max(100000000)),
      })
      .parse(req.body);
    const s: State = res.locals.state;
    const b = structuredClone(s.borrower);
    b.records = b.records.map((r) =>
      r.category === "expense"
        ? { ...r, amount: Math.round(r.amount * (1 - expenseReduction / 100)) }
        : r,
    );
    if (b.closingBalance !== null) b.closingBalance += balanceIncrease;
    res.json({
      assessment: assess(b, s.revision),
      label:
        "Conditional model calculation only. Not an issued assessment, forecast or loan offer.",
    });
  });
  app.delete("/api/data", async (req, res) => {
    z.object({ confirm: z.literal("DELETE") }).parse(req.body);
    const deletion = await store.delete(res.locals.owner);
    res.clearCookie("folio_session", { path: "/" });
    res.clearCookie("folio_mode", { path: "/" });
    res.json({
      deleted: true,
      cleanupPending: deletion.cleanupPending,
      message: deletion.cleanupPending
        ? "Your application records and sharing access were deleted. Analytics cleanup is pending and remains inaccessible. Retry a fresh start when database maintenance is complete. Downloaded/provider copies are unaffected."
        : "Your application records, derived assessments and shares were deleted. This does not recall downloaded reports or erase provider data/backups.",
    });
  });
  registerUploads(app, store);
  registerAI(app, store);
  registerNessie(app, store);
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof CleanupPendingError) {
        res.status(503).json({ error: error.message });
        return;
      }
      const validation = error instanceof z.ZodError;
      res.status(validation ? 400 : 500).json({
        error: validation
          ? "Check the requested values and try again."
          : "The action could not complete. Please retry; your saved progress is preserved.",
      });
    },
  );
  return { app, store, db: store.db!, ready };
}
