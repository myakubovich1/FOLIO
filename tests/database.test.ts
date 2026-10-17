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
