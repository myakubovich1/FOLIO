import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { hostedApi } from "../server/serverless.js";
import { appUrl } from "../server/config.js";
import { databasePool } from "../server/database.js";

const names = [
  "DATABASE_URL",
  "APP_URL",
  "VERCEL_URL",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "FOLIO_DATABASE_CERT_HOST",
  "FOLIO_DATABASE_CERT_SHA256",
  "FOLIO_DATABASE_CA_BASE64",
] as const;

test("hosted API fails closed without durable storage and reveals no connection details", async () => {
  const prior = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const server = createServer((req, res) => {
    void hostedApi(req, res);
  });
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw Error("No port");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.text();
    assert.match(body, /not configured/);
    assert.doesNotMatch(body, /postgres|password|\.data\//);
  } finally {
    if (prior === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prior;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("hosted origin defaults and portable CA retain certificate and hostname enforcement", async () => {
  const prior = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  try {
    delete process.env.APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_URL = "folio-deployment.example";
    assert.equal(appUrl(), "https://folio-deployment.example");
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "folio.example";
    assert.equal(appUrl(), "https://folio.example");
    process.env.VERCEL_ENV = "preview";
    assert.equal(appUrl(), "https://folio-deployment.example");
    process.env.VERCEL_ENV = "production";
    assert.equal(appUrl(), "https://folio.example");
    process.env.APP_URL = "https://custom.example";
    assert.equal(appUrl(), "https://custom.example");
    process.env.FOLIO_DATABASE_CERT_HOST = "pinned.example:5432";
    process.env.FOLIO_DATABASE_CERT_SHA256 = "aabbcc";
    process.env.DATABASE_URL =
      "postgres://pinned.example:5432/db?sslmode=verify-full";
    process.env.FOLIO_DATABASE_CA_BASE64 =
      Buffer.from("public-service-ca").toString("base64");
    process.env.VERCEL = "1";
    const pool = databasePool(process.env.DATABASE_URL);
    try {
      const ssl = pool.options.ssl;
      assert.ok(ssl && typeof ssl === "object");
      assert.equal(ssl.ca, "public-service-ca");
      assert.equal(ssl.rejectUnauthorized, true);
      assert.equal(typeof ssl.checkServerIdentity, "function");
      assert.equal(pool.options.max, 2);
      assert.equal(pool.options.idleTimeoutMillis, 10000);
      assert.throws(
        () => databasePool("postgres://pinned.example:5432/db?sslmode=disable"),
        /verify-full/,
      );
    } finally {
      await pool.end();
    }
  } finally {
    for (const name of names)
      if (prior[name] === undefined) delete process.env[name];
      else process.env[name] = prior[name];
  }
});
