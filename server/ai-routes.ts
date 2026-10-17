import { reserveProviderCall } from "./provider-budget.js";
import type { Express } from "express";
import { z } from "zod";
import type { Store } from "./store.js";
import type { State } from "../src/contracts.js";
import { deterministicExplanation } from "./explanations.js";
import {
  geminiExplanation,
  suggestClassifications,
  ProviderUnavailable,
  suggestIncomePattern,
} from "./gemini.js";
export function registerAI(app: Express, store: Store) {
  app.use(
    ["/api/explanation", "/api/classifications", "/api/income-pattern"],
    async (req, res, next) => {
      if (
        req.method !== "POST" ||
        (req.originalUrl.split("?")[0] === "/api/explanation" &&
          req.body?.provider !== "gemini")
      ) {
        next();
        return;
      }
      if (!(await reserveProviderCall(store, res.locals.owner, "gemini"))) {
        res.status(429).json({
          error:
            "Please wait one minute before another AI request. Manual review and calculated explanations remain available.",
        });
        return;
      }
      next();
    },
  );
  app.post("/api/explanation", async (req, res) => {
    const { question, provider, consent } = z
      .object({
        question: z
          .string()
          .max(500)
          .default("How was my assessment calculated?"),
        provider: z.enum(["deterministic", "gemini"]).default("deterministic"),
        consent: z.boolean().default(false),
      })
      .parse(req.body);
    const state: State = res.locals.state;
    if (!state.assessment) {
      res
        .status(409)
        .json({ error: "Add records before requesting an explanation." });
      return;
    }
    if (provider === "gemini" && !consent) {
      res.status(400).json({
        error:
          "Confirm permission to send the limited evidence bundle to Gemini.",
      });
      return;
    }
    const owner = res.locals.owner as string;
    try {
      const explanation =
        provider === "gemini"
          ? await geminiExplanation(state, question)
          : deterministicExplanation(state, question);
      const result = await store.mutate(owner, (s) => {
        if (s.revision !== state.revision)
          throw new Error(
            "Records changed during explanation. Retry for the current revision.",
          );
        s.explanation = explanation;
      });
      res.json({ state: result.state, explanation });
    } catch (e) {
      res.status(e instanceof ProviderUnavailable ? 503 : 409).json({
        error:
          e instanceof ProviderUnavailable
            ? e.message
            : "The input revision changed or the evidence could not be verified. Retry for your current records.",
      });
    }
  });
  app.post("/api/income-pattern", async (req, res) => {
    z.object({ consent: z.literal(true) }).parse(req.body);
    const state: State = res.locals.state;
    try {
      const suggestion = await suggestIncomePattern(state);
      const result = await store.mutate(res.locals.owner, (s) => {
        if (s.revision !== state.revision) throw Error("Changed revision");
        s.patternSuggestion = { ...suggestion, revision: s.revision };
      });
      res.json(result.state);
    } catch (e) {
      res.status(503).json({
        error:
          e instanceof ProviderUnavailable
            ? e.message
            : "Pattern suggestion is unavailable. You can confirm your income pattern manually.",
      });
    }
  });
  app.post("/api/classifications", async (req, res) => {
    z.object({ consent: z.literal(true) }).parse(req.body);
    const state: State = res.locals.state;
    try {
      const suggestions = await suggestClassifications(state);
      const result = await store.mutate(res.locals.owner, (s) => {
        if (s.revision !== state.revision) throw Error("Changed revision");
        for (const suggestion of suggestions) {
          const record = s.borrower.records.find(
            (r) => r.id === suggestion.id,
          )!;
          record.suggestion = {
            category: suggestion.category,
            reason: suggestion.reason,
            evidence: suggestion.evidence,
          };
        }
      });
      res.json(result.state);
    } catch (e) {
      res.status(503).json({
        error:
          e instanceof ProviderUnavailable
            ? e.message
            : "Classification suggestions are unavailable. You can review and correct records manually.",
      });
    }
  });
}
