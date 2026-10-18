import { useEffect, useState } from "react";
import type { State, ImportPreview } from "../contracts";
import { api, money } from "../api";
export function Sources({
  state,
  onState,
  onSaved,
  publicSandbox = false,
}: {
  state: State;
  publicSandbox?: boolean;
  onState: (s: State) => void;
  onSaved: () => Promise<void>;
}) {
  const demo = state.mode !== "owner";
  const [tab, setTab] = useState(demo ? "saved" : "upload");
  const [consent, setConsent] = useState(false),
    [aiConsent, setAiConsent] = useState(false),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    const id = sessionStorage.getItem("folio-upload-preview-v1");
    if (!id) return;
    api<ImportPreview>(`uploads/${id}`)
      .then((p) => {
        setPreview(p);
        setTab("upload");
      })
      .catch(() => sessionStorage.removeItem("folio-upload-preview-v1"));
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("consent", String(consent));
    form.append("aiConsent", String(aiConsent));
    await run(async () => {
      const p = await api<ImportPreview>("uploads/preview", "POST", form);
      setPreview(p);
      setReviewed(false);
      sessionStorage.setItem("folio-upload-preview-v1", p.id);
    });
  }
  return (
    <section className="card source-panel">
      <div className="step">02 / ADD RECORDS</div>
      <h2>Start with the records you have.</h2>
      <p>
        Choose a source, understand its scope, then review the interpretation
        before issuing a report.
      </p>
      <div className="tabs" aria-label="Record sources">
        {demo && (
          <button
            aria-pressed={tab === "saved"}
            onClick={() => {
              setTab("saved");
              setConsent(false);
              setAiConsent(false);
            }}
          >
            Saved demo
          </button>
        )}
        <button
          aria-pressed={tab === "upload"}
          onClick={() => {
            setTab("upload");
            setConsent(false);
            setAiConsent(false);
          }}
        >
          Upload statement
        </button>
        <button
          aria-pressed={tab === "nessie"}
          onClick={() => {
            setTab("nessie");
            setConsent(false);
            setAiConsent(false);
          }}
        >
          Nessie simulation
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {busy && (
        <p role="status" className="processing">
          {file?.name.toLowerCase().endsWith(".pdf")
            ? "Extracting and validating statement records…"
            : "Processing and validating your records…"}
        </p>
      )}
      {tab === "saved" && (
        <div className="source-body">
          <span className="pill">
            Saved synthetic data · {state.borrower.currency}
          </span>
          <h3>No bank login. No real personal data.</h3>
          <p>
            This profile contains saved synthetic activity from{" "}
            {state.borrower.start} to {state.borrower.end}. Folio will classify
            it, calculate financial features and keep a local demo workspace. No
            live bank request is made.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I agree to process these synthetic records for this demo.
          </label>
          <button
            className="primary"
            disabled={!consent || busy || state.connected}
            onClick={() =>
              run(async () => {
                await onSaved();
                setMessage("Saved records are ready to review.");
              })
            }
          >
            Use saved records
          </button>
          {state.connected && (
            <p className="fine">
              A source is already connected. Choose a fresh demo profile to
              switch to saved records.
            </p>
          )}
        </div>
      )}
      {tab === "upload" && (
        <div className="source-body">
          <h3>A statement you can inspect.</h3>
          <p>
            CSV: up to 1 MB and 5,000 rows. PDF: up to 4 MB and 10 pages, with
            Gemini extraction. Use one currency and one account alias per file.
            Balances and complete coverage are checked rather than assumed.
          </p>
          <a
            className="text-link"
            href={`/api/sample.csv?profile=${demo ? state.borrower.id : "newcomer"}`}
            download
          >
            Download synthetic example CSV ↓
          </a>
          {demo && (
            <p className="caution">
              Public demos accept only this exact synthetic example. Sign in
              before uploading your own records. PDF extraction is available to
              authenticated owners.
            </p>
          )}
          <label htmlFor="record-file">Choose a CSV or PDF statement</label>
          <input
            id="record-file"
            type="file"
            accept=".csv,.pdf,text/csv,application/pdf"
            onChange={(e) => {
              const selected = e.target.files?.[0] || null;
              const limit = selected?.name.toLowerCase().endsWith(".csv")
                ? 1024 * 1024
                : 4 * 1024 * 1024;
              if (selected && selected.size > limit) {
                setFile(null);
                setError("Choose a CSV up to 1 MB or a PDF up to 4 MB.");
              } else {
                setFile(selected);
                setError("");
              }
              setPreview(null);
              setReviewed(false);
            }}
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I have permission to process this file and save its records in this
            workspace.
          </label>
          {file?.name.toLowerCase().endsWith(".pdf") && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
              />
              I agree to send this PDF to Gemini for extraction. It may contain
              personal financial information. The original file is held in
              memory only; the parsed preview expires after 15 minutes.
            </label>
          )}
          <button
            className="primary"
            disabled={
              !file ||
              !consent ||
              busy ||
              (file.name.toLowerCase().endsWith(".pdf") && !aiConsent)
            }
            onClick={upload}
          >
            Preview and validate file
          </button>
          {preview && (
            <section className="upload-preview">
              <div className="eyebrow">REVIEW BEFORE IMPORT</div>
              <h3>{preview.filename}</h3>
              <div className="preview-stats">
                <span>{preview.rows.length} accepted rows</span>
                <span>{preview.duplicates} duplicates</span>
                <span>{preview.unresolved} need classification</span>
              </div>
              <p className={preview.reconciled ? "success" : "caution"}>
                {preview.message}
              </p>
              <p className="fine">
                {preview.source.coverageStart} → {preview.source.coverageEnd} ·
                closing balance{" "}
                {money(
                  preview.source.closingBalance ?? undefined,
                  state.borrower.currency,
                )}
                . Account type: {preview.source.accountType || "unknown"}.{" "}
                {preview.source.kind === "synthetic"
                  ? "Synthetic example."
                  : "User-provided evidence, not independent verification."}
              </p>
              {!["checking", "savings", "mobile-money"].includes(
                preview.source.accountType || "unknown",
              ) && (
                <p className="caution">
                  This account type cannot establish liquid savings. A complete
                  checking, savings or mobile-money statement is required for
                  liquid balance evidence; a credit limit is not a cash buffer.
                </p>
              )}
              {preview.errors.length > 0 && (
                <div className="error" role="alert">
                  <strong>
                    {preview.errors.length} rows or fields need correction.
                  </strong>
                  {preview.errors.slice(0, 12).map((e, i) => (
                    <p key={i}>
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                  <p>
                    Correct the original file and preview it again. Existing
                    source records have not changed.
                  </p>
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date / source</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.date}
                          <small>{r.sourceLocation}</small>
                        </td>
                        <td>{r.description}</td>
                        <td>{money(r.amount, r.currency)}</td>
                        <td>{r.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="fine">
                Showing the first 10 accepted rows. Every imported row remains
                available in Records. No error row is silently imported.
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I have reviewed the source coverage, reconciliation and
                interpretation. I can correct classifications next.
              </label>
              <button
                disabled={!reviewed || preview.errors.length > 0 || busy}
                className="primary"
                onClick={() =>
                  run(async () => {
                    const result = await api<{
                      state: State;
                      accepted: number;
                      duplicates: number;
                    }>(`uploads/${preview.id}/commit`, "POST", {
                      confirm: true,
                    });
                    onState(result.state);
                    setPreview(null);
                    sessionStorage.removeItem("folio-upload-preview-v1");
                    setMessage(
                      `Imported ${result.accepted} records; ${result.duplicates} duplicates skipped.`,
                    );
                  })
                }
              >
                Import {preview.rows.length} records
              </button>
            </section>
          )}
        </div>
      )}
      {tab === "nessie" && (
        <div className="source-body">
          <h3>A banking simulation, clearly labeled.</h3>
          <p>
            Nessie provides synthetic USD banking resources. This is not a real
            bank-credential connection. We import only the configured synthetic
            customer’s records, report unavailable feeds, and never turn
            incomplete API coverage into a favorable assumption.
          </p>
          {demo && !publicSandbox ? (
            <p className="caution">
              Sign in to connect the configured Nessie simulation. Saved demo
              data remains available without external services.
            </p>
          ) : (
            <>
              {demo && (
                <p className="caution">
                  This server enables a dedicated public synthetic sandbox. Each
                  demo has isolated interpretations and sharing. The same mock
                  source records can be read by other demo users; never upload
                  real personal information here.
                </p>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I permit reading the configured synthetic customer’s available
                accounts and financial resources.
              </label>
              <button
                className="primary"
                disabled={!consent || busy}
                onClick={() =>
                  run(async () => {
                    const result = await api<{ state: State }>(
                      "nessie/sync",
                      "POST",
                      { consent: true },
                    );
                    onState(result.state);
                    setMessage(
                      "Available sandbox records were synchronized. Review missing coverage before assessing.",
                    );
                  })
                }
              >
                Synchronize Nessie records
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
