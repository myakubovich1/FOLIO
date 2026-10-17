import "../server/config.js";
import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const port = 3103,
  root = `http://127.0.0.1:${port}`,
  env = {
    ...process.env,
    PORT: String(port),
    APP_URL: root,
    NODE_ENV: "production" as const,
  };
let processHandle: ChildProcess | undefined;
async function start() {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    { env, stdio: ["ignore", "ignore", "ignore"] },
  );
  processHandle = child;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null)
      throw Error("Persistence verification server did not start");
    try {
      if (
        (
          await fetch(root + "/api/health", {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      )
        return;
    } catch {
      /* await readiness */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw Error("Persistence verification readiness timed out");
}
async function stop() {
  const p = processHandle;
  if (!p || p.exitCode !== null) return;
  const done = new Promise<void>((r) => p.once("exit", () => r()));
  p.kill("SIGTERM");
  await done;
  processHandle = undefined;
}
async function call(path: string, method = "GET", body?: unknown, cookie = "") {
  return fetch(root + "/api/" + path, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const report: Record<string, unknown> = {
  at: new Date().toISOString(),
  scope:
    "Actual production app processes and configured database; synthetic demo only. No Auth0 callback claim.",
};
let a = "",
  b = "";
try {
  if (!process.env.DATABASE_URL) throw Error("Configured database required");
  await start();
  const first = await call("session", "POST", { profile: "newcomer" });
  assert.equal(first.status, 200);
  a = first.headers.get("set-cookie")!.split(";")[0];
  await call("connect", "POST", { consent: true }, a);
  const initial = await (await call("passports", "POST", {}, a)).json();
  const priorPassport = initial.passports[0];
  const oldShare = await (
    await call("shares", "POST", { passportId: priorPassport.id }, a)
  ).json();
  const correction = await call(
    "records/newcomer-correction",
    "PATCH",
    { category: "transfer" },
    a,
  );
  assert.equal(correction.status, 200);
  assert.equal((await correction.json()).assessment.score, 70);
  const current = await (await call("passports", "POST", {}, a)).json();
  const latest = current.passports[0];
  const newShare = await (
    await call("shares", "POST", { passportId: latest.id }, a)
  ).json();
  assert.equal(
    (await call(`shares/${oldShare.state.shares[0].id}`, "DELETE", {}, a))
      .status,
    200,
  );
  await stop();
  await start();
  const restored = await (await call("state", "GET", undefined, a)).json();
  assert.equal(restored.assessment.score, 70);
  assert.equal(restored.passports.length, 2);
  assert.equal(restored.passports[1].assessment.score, 71);
  const cashflow = await (await call("cashflow", "GET", undefined, a)).json();
  assert.equal(
    cashflow.rows.reduce((n: number, r: { income: number }) => n + r.income, 0),
    5040000,
  );
  assert.match(cashflow.backend, /Timescale/);
  assert.equal((await call(`shared/${oldShare.token}`)).status, 410);
  assert.equal((await call(`shared/${oldShare.token}/pdf`)).status, 410);
  assert.equal((await call(`shared/${newShare.token}`)).status, 200);
  assert.equal(
    (await call(`passports/${latest.id}/pdf`, "GET", undefined, a)).status,
    200,
  );
  const second = await call("session", "POST", { profile: "newcomer" });
  b = second.headers.get("set-cookie")!.split(";")[0];
  await call("connect", "POST", { consent: true }, b);
  assert.equal(
    (await (await call("state", "GET", undefined, b)).json()).assessment.score,
    71,
  );
  assert.equal(
    (await call(`passports/${latest.id}/pdf`, "GET", undefined, b)).status,
    404,
  );
  assert.equal(
    (await call("shares", "POST", { passportId: latest.id }, b)).status,
    404,
  );
  assert.equal(
    (await call(`shares/${newShare.state.shares[0].id}`, "DELETE", {}, a))
      .status,
    200,
  );
  await stop();
  await start();
  assert.equal((await call(`shared/${newShare.token}`)).status, 410);
  assert.equal((await call(`shared/${newShare.token}/pdf`)).status, 410);
  assert.equal(
    (await (await call("state", "GET", undefined, a)).json()).assessment.score,
    70,
  );
  Object.assign(report, {
    passed: true,
    restarts: 2,
    records: restored.borrower.records.length,
    assessmentRevisionsPreserved: true,
    immutablePassportsPreserved: true,
    sessionPreserved: true,
    revocationPreserved: true,
    otherSessionDeniedPassportAndShare: true,
    monthlyIncome: 5040000,
    currency: "USD",
    cashflowBackend: cashflow.backend,
  });
} catch {
  Object.assign(report, {
    passed: false,
    error:
      "Production restart/persistence assertion failed; no credentials or session tokens logged.",
  });
  process.exitCode = 1;
} finally {
  for (const cookie of [a, b])
    if (cookie)
      await call("data", "DELETE", { confirm: "DELETE" }, cookie).catch(
        () => {},
      );
  await stop();
  mkdirSync("output/verification", { recursive: true });
  writeFileSync(
    "output/verification/app-persistence.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}
