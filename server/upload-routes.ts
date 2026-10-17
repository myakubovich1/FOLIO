import type { Express } from "express";
import multer from "multer";
import { z } from "zod";
import type { Store } from "./store.js";
import type { ImportPreview, State } from "../src/contracts.js";
import { applyImport, isSample, previewCsv } from "./imports.js";
import { assess } from "./assessment.js";
import { extractStatement } from "./gemini.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 },
});
export function registerUploads(app: Express, store: Store) {
  app.post("/api/uploads/preview", upload.single("file"), async (req, res) => {
    if (req.body?.consent !== "true") {
      res.status(400).json({
        error: "Confirm permission to process this file before uploading.",
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({
        error:
          "Choose a CSV file up to 1 MB, or a PDF statement up to 5 MB and 10 pages.",
      });
      return;
    }
    const file = req.file;
    const state: State = res.locals.state;
    let preview: ImportPreview;
    const isPdf = file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      if (state.mode !== "owner") {
        res.status(403).json({
          error:
            "Sign in to extract your own PDF statement. The public demo uses synthetic CSV examples.",
        });
        return;
      }
      if (req.body.aiConsent !== "true") {
        res.status(400).json({
          error:
            "Confirm permission to send this PDF to Gemini for extraction.",
        });
        return;
      }
      try {
        preview = await extractStatement(file.buffer, file.originalname);
      } catch (e) {
        res.status(503).json({
          error:
            e instanceof Error
              ? e.message
              : "PDF extraction failed. Retry or use the CSV example format.",
        });
        return;
      }
    } else {
      if (
        !file.originalname.toLowerCase().endsWith(".csv") ||
        file.size > 1024 * 1024
      ) {
        res.status(400).json({
          error:
            "Choose a CSV file up to 1 MB, or a PDF up to 5 MB and 10 pages.",
        });
        return;
      }
      const text = file.buffer.toString("utf8");
      if (state.mode !== "owner" && !isSample(text)) {
        res.status(403).json({
          error:
            "Public demos accept only the downloadable synthetic example. Sign in to upload your own records.",
        });
        return;
      }
      try {
        preview = previewCsv(text, file.originalname);
      } catch (e) {
        res.status(400).json({
          error: e instanceof Error ? e.message : "The file could not be read.",
        });
        return;
      }
    }
    await store.mutate(res.locals.owner, async (_state, q) => {
      await q("DELETE FROM folio_previews WHERE owner=$1 AND expires<$2", [
        res.locals.owner,
        Date.now(),
      ]);
      await q(
        "INSERT INTO folio_previews(id,owner,data,expires) VALUES ($1,$2,$3,$4)",
        [
          preview.id,
          res.locals.owner,
          JSON.stringify(preview),
          Date.now() + 15 * 60000,
        ],
      );
    });
    res.json(preview);
  });
  app.get("/api/uploads/:id", async (req, res) => {
    const rows = await store.query(
      "SELECT data FROM folio_previews WHERE id=$1 AND owner=$2 AND expires>$3",
      [req.params.id, res.locals.owner, Date.now()],
    );
    if (!rows[0]) {
      res.status(404).json({
        error: "Preview is unavailable or expired. Choose your file again.",
      });
      return;
    }
    res.json(
      typeof rows[0].data === "string"
        ? JSON.parse(rows[0].data)
        : rows[0].data,
    );
  });
  app.post("/api/uploads/:id/commit", async (req, res) => {
    z.object({ confirm: z.literal(true) }).parse(req.body);
    const rows = await store.query(
      "SELECT data FROM folio_previews WHERE id=$1 AND owner=$2 AND expires>$3",
      [req.params.id, res.locals.owner, Date.now()],
    );
    if (!rows[0]) {
      res.status(404).json({
        error: "Preview is unavailable or expired. Choose your file again.",
      });
      return;
    }
    const preview: ImportPreview =
      typeof rows[0].data === "string"
        ? JSON.parse(rows[0].data)
        : rows[0].data;
    try {
      const result = await store.mutate(res.locals.owner, (s) => {
        const counts = applyImport(s, preview);
        s.assessment = assess(s.borrower, s.revision);
        return counts;
      });
      res.json({ state: result.state, ...result.value });
    } catch (e) {
      res.status(400).json({
        error:
          e instanceof Error
            ? e.message
            : "Import could not be saved. Your original records are unchanged.",
      });
    }
  });
  app.post("/api/sources/:id/reconnect", async (req, res) => {
    z.object({ consent: z.literal(true) }).parse(req.body);
    if (
      !(res.locals.state as State).sources?.some((s) => s.id === req.params.id)
    ) {
      res.status(404).json({ error: "Source not found." });
      return;
    }
    const result = await store.mutate(res.locals.owner, (s) => {
      const source = s.sources!.find((x) => x.id === req.params.id)!;
      source.connected = true;
      source.consentedAt = new Date().toISOString();
    });
    res.json(result.state);
  });
  app.delete("/api/sources/:id", async (req, res) => {
    const state: State = res.locals.state;
    if (!state.sources?.some((s) => s.id === req.params.id)) {
      res.status(404).json({ error: "Source not found." });
      return;
    }
    const result = await store.mutate(res.locals.owner, (s) => {
      s.sources!.find((x) => x.id === req.params.id)!.connected = false;
      delete s.explanation;
    });
    res.json(result.state);
  });
}
