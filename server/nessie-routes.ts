import { reserveProviderCall } from "./provider-budget.js";
import type { Express } from "express";
import { z } from "zod";
import type { Store } from "./store.js";
import type { State } from "../src/contracts.js";
import { ProviderUnavailable } from "./gemini.js";
import { NessieClient } from "./nessie.js";
import { applyImport } from "./imports.js";
import { assess } from "./assessment.js";
import { randomUUID } from "node:crypto";
export function registerNessie(app: Express, store: Store) {
  app.post("/api/nessie/sync", async (req, res) => {
    z.object({ consent: z.literal(true) }).parse(req.body);
    const state: State = res.locals.state;
    if (state.mode !== "owner" && process.env.FOLIO_PUBLIC_SANDBOX !== "true") {
      res.status(403).json({
        error:
          "Sign in to connect the dedicated Nessie banking simulation. Public demos use saved synthetic records.",
      });
      return;
    }
    if (state.borrower.currency !== "USD") {
      res.status(400).json({
        error:
          "Nessie is a USD banking simulation. Use a USD profile; it cannot be relabeled as Belarusian bank data.",
      });
      return;
    }
    const previous = state.sources?.filter((s) => s.kind === "sandbox");
    if (previous?.length && previous.some((s) => !s.connected)) {
      res.status(409).json({
        error:
          "This source is disconnected. Reconnect it explicitly before synchronizing.",
      });
      return;
    }
    if (!(await reserveProviderCall(store, res.locals.owner, "nessie"))) {
      res.status(429).json({
        error:
          "Wait one minute before another Nessie synchronization. Your saved records remain available.",
      });
      return;
    }
    try {
      const result = await new NessieClient().ingest();
      if (!result.previews.some((p) => p.rows.length))
        throw new ProviderUnavailable(
          "The configured accounts returned no usable dated movements. Check available feeds or upload a complete statement; no source was marked complete.",
        );
      const saved = await store.mutate(res.locals.owner, (s) => {
        for (const preview of result.previews)
          if (preview.rows.length) applyImport(s, preview);
        s.assessment = assess(s.borrower, s.revision);
        s.providerSync = {
          nessie: {
            at: new Date().toISOString(),
            accounts: result.previews.length,
            records: result.previews.reduce((n, p) => n + p.rows.length, 0),
            capabilities: result.capabilities,
          },
        };
      });
      res.json({ state: saved.state, capabilities: result.capabilities });
    } catch (e) {
      await store.mutate(res.locals.owner, (s) => {
        (s.ingestions ??= []).unshift({
          id: randomUUID(),
          sourceId: "nessie",
          at: new Date().toISOString(),
          status: "failed",
          accepted: 0,
          duplicates: 0,
          unresolved: 0,
          message:
            "Nessie synchronization failed. No synthetic fallback or partial unreviewed data was substituted.",
        });
      });
      res.status(503).json({
        error:
          e instanceof ProviderUnavailable
            ? e.message
            : "Nessie synchronization could not complete. Check configuration and provider status, then retry. Saved records were preserved.",
      });
    }
  });
}
