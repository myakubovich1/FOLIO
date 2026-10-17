import test from "node:test";
import assert from "node:assert/strict";
import { api } from "../src/api.js";
test("aborted or malformed successful response bodies never become typed assessment/state values", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: () =>
          Promise.reject(new DOMException("Body aborted", "AbortError")),
      }) as Response;
    await assert.rejects(
      api("preview/newcomer"),
      (e) => e instanceof DOMException && e.name === "AbortError",
    );
    globalThis.fetch = async () =>
      new Response("invalid json", { status: 200 });
    await assert.rejects(api("state"), /unreadable response/);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Retry provider later" }), {
        status: 503,
      });
    await assert.rejects(api("state"), /Retry provider later/);
  } finally {
    globalThis.fetch = original;
  }
});
