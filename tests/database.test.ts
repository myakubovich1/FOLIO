import test from "node:test";
import assert from "node:assert/strict";
import type { PeerCertificate } from "node:tls";
import { verifyPinnedCertificate } from "../server/database.js";
test("database pin requires both the expected hostname and exact certificate fingerprint", () => {
  const cert = {
    subjectaltname: "DNS:demo.example",
    subject: { CN: "demo.example" },
    fingerprint256: "AA:BB:CC",
  } as PeerCertificate;
  assert.equal(
    verifyPinnedCertificate("demo.example", cert, "aabbcc"),
    undefined,
  );
  assert.match(
    verifyPinnedCertificate("demo.example", cert, "ddbbcc")!.message,
    /pin changed/,
  );
  assert.ok(verifyPinnedCertificate("other.example", cert, "aabbcc"));
});

test("primary pin configuration fails closed and separate local test pools retain their own policy", async () => {
  const { databasePool } = await import("../server/database.js");
  const keys = [
    "DATABASE_URL",
    "FOLIO_DATABASE_CERT_HOST",
    "FOLIO_DATABASE_CERT_SHA256",
  ] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    process.env.FOLIO_DATABASE_CERT_SHA256 = "aabbcc";
    delete process.env.FOLIO_DATABASE_CERT_HOST;
    assert.throws(
      () => databasePool("postgres://pinned.example:5432/db"),
      /service host and port/,
    );
    process.env.FOLIO_DATABASE_CERT_HOST = "pinned.example:5432";
    for (const query of [
      "",
      "?sslmode=disable",
      "?sslmode=verify-full&sslrootcert=ca.pem&sslcert=client.pem",
      "?sslmode=verify-full&sslrootcert=ca.pem&sslkey=client.key",
    ])
      assert.throws(
        () => databasePool("postgres://pinned.example:5432/db" + query),
        /verify-full/,
      );
    process.env.DATABASE_URL =
      "postgres://wrong.example:5432/db?sslmode=require";
    assert.throws(
      () => databasePool(process.env.DATABASE_URL!),
      /differs from its configured certificate pin/,
    );
    const local = databasePool("postgres://localhost:5433/test");
    await local.end();
  } finally {
    for (const k of keys)
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
  }
});
