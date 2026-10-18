import { useEffect, useRef, useState } from "react";
import type { State, Passport } from "../contracts";
import { api, displayDate } from "../api";
import { Report } from "./Report";
import { SharingFlow } from "./WorkflowViews";
export function PassportBuilder({
  state,
  onState,
}: {
  state: State;
  onState: (s: State) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(
    () => state.passports.length === 0,
  );
  const previewSummaryRef = useRef<HTMLElement>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [factors, setFactors] = useState(true),
    [cashflow, setCashflow] = useState(true),
    [preview, setPreview] = useState<Passport | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPreview(null);
    api<Passport>(
      "passports/preview",
      "POST",
      { disclosure: { factors, cashflow } },
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) setPreview(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.name !== "AbortError")
          setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [state.revision, factors, cashflow, previewAttempt]);
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
  return (
    <>
      <section className="card">
        <div className="step">04 / YOUR FINANCIAL PASSPORT</div>
        <h2>Share the picture. Keep control.</h2>
        <p>
          Choose optional details and inspect exactly what a recipient can see.
          Your identity, account identifiers and raw transaction history are
          excluded.
        </p>
        <div className="disclosure-options">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={factors}
              disabled={busy}
              onChange={(e) => setFactors(e.target.checked)}
            />
            Include factor contributions
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={cashflow}
              disabled={busy}
              onChange={(e) => setCashflow(e.target.checked)}
            />
            Include cash-flow totals
          </label>
        </div>
        <p className="fine">
          The index or abstention, evidence confidence, source type, model,
          coverage and limitations always remain.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
            {!preview && !loading && (
              <button onClick={() => setPreviewAttempt((n) => n + 1)}>
                Retry recipient preview
              </button>
            )}
          </p>
        )}
        <button
          className="primary"
          disabled={busy || loading || !preview}
          onClick={() =>
            run(async () =>
              onState(
                await api<State>("passports", "POST", {
                  disclosure: { factors, cashflow },
                  expectedRevision: state.revision,
                }),
              ),
            )
          }
        >
          Generate passport snapshot
        </button>
      </section>
      <details className="card sharing-flow">
        <summary>Explore the sharing flow</summary>
        <SharingFlow
          state={state}
          factors={factors}
          cashflow={cashflow}
          previewState={loading ? "loading" : preview ? "ready" : "unavailable"}
          onPreview={() => {
            if (!previewSummaryRef.current) return;
            setPreviewOpen(true);
            previewSummaryRef.current.focus({ preventScroll: true });
            previewSummaryRef.current.scrollIntoView({
              block: "start",
              behavior: "auto",
            });
          }}
        />
      </details>
      {loading ? (
        <section className="card skeleton" role="status">
          Preparing your recipient preview…
        </section>
      ) : (
        preview && (
          <details
            className="recipient-preview"
            open={previewOpen}
            onToggle={(event) => setPreviewOpen(event.currentTarget.open)}
          >
            <summary ref={previewSummaryRef}>
              Recipient preview · current revision {state.revision}
            </summary>
            <Report passport={preview} />
          </details>
        )
      )}
      {state.passports.length === 0 && !loading && (
        <p className="fine">
          No snapshot has been issued yet. Generate it when the preview is
          ready.
        </p>
      )}
      {state.passports.map((p) => (
        <section key={p.id} className="issued-passport">
          <div className="split passport-heading">
            <h2>Issued revision {p.assessment.revision}</h2>
            <span className="pill">{displayDate(p.generatedAt)}</span>
          </div>
          <Report passport={p} />
          <div className="report-actions">
            <a
              className="button secondary"
              href={`/api/passports/${p.id}/pdf`}
              download
            >
              Download passport PDF ↓
            </a>
          </div>
        </section>
      ))}
    </>
  );
}
