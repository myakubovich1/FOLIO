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
  const previewRef = useRef<HTMLDetailsElement>(null);
  const previewSummaryRef = useRef<HTMLElement>(null);
  const [copyMessage, setCopyMessage] = useState<{
    shareId: string;
    text: string;
  } | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [factors, setFactors] = useState(true),
    [cashflow, setCashflow] = useState(true),
    [preview, setPreview] = useState<Passport | null>(null),
    [days, setDays] = useState(7),
    [urls, setUrls] = useState<Record<string, string>>({}),
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
        <label htmlFor="share-days">New link lifetime</label>
        <select
          id="share-days"
          disabled={busy}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={1}>1 day</option>
          <option value={7}>7 days (recommended)</option>
          <option value={30}>30 days</option>
        </select>
        <p className="fine">
          Every access checks expiry and revocation, including PDF downloads.
          Revocation stops future access through Folio; it cannot recall a copy
          someone already downloaded.
        </p>
      </section>
      <details className="card sharing-flow">
        <summary>Explore the sharing flow</summary>
        <SharingFlow
          state={state}
          factors={factors}
          cashflow={cashflow}
          days={days}
          previewState={loading ? "loading" : preview ? "ready" : "unavailable"}
          onPreview={() => {
            if (!previewRef.current || !previewSummaryRef.current) return;
            previewRef.current.open = true;
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
            ref={previewRef}
            className="recipient-preview"
            open={state.passports.length === 0}
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
            <button
              disabled={busy}
              className="primary"
              onClick={() =>
                run(async () => {
                  const r = await api<{ state: State; token: string }>(
                    "shares",
                    "POST",
                    { passportId: p.id, days },
                  );
                  onState(r.state);
                  setCopyMessage(null);
                  setUrls((old) => ({
                    ...old,
                    [r.state.shares[0].id]:
                      `${location.origin}/shared/${r.token}`,
                  }));
                })
              }
            >
              Create {days}-day read-only link
            </button>
          </div>
          {state.shares
            .filter((s) => s.passportId === p.id && urls[s.id])
            .map((s) => (
              <section className="card share-result" key={s.id}>
                <label htmlFor={`share-${s.id}`}>
                  New passport link · revision {p.assessment.revision} · copy
                  before refresh
                </label>
                <input
                  id={`share-${s.id}`}
                  value={urls[s.id]}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <small>
                  Link {s.id.slice(0, 6)} · expires {displayDate(s.expiresAt)}
                </small>
                {s.revoked || !(Date.parse(s.expiresAt) > Date.now()) ? (
                  <p>{s.revoked ? "Revoked" : "Expired or unavailable"}</p>
                ) : (
                  <div className="share-link-actions">
                    <button
                      className="secondary"
                      onClick={async () => {
                        if (!(Date.parse(s.expiresAt) > Date.now())) {
                          setCopyMessage({
                            shareId: s.id,
                            text: "This link has expired. Create a new link.",
                          });
                          return;
                        }
                        try {
                          await navigator.clipboard.writeText(urls[s.id]);
                          setCopyMessage({
                            shareId: s.id,
                            text: "Link copied. Share it only with the intended recipient.",
                          });
                        } catch {
                          const input = document.getElementById(
                            `share-${s.id}`,
                          ) as HTMLInputElement | null;
                          input?.focus();
                          input?.select();
                          setCopyMessage({
                            shareId: s.id,
                            text: "Automatic copy is unavailable. The link is selected; copy it manually.",
                          });
                        }
                      }}
                    >
                      Copy passport link
                    </button>
                    <a
                      className="text-link"
                      href={urls[s.id]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open recipient preview ↗
                    </a>
                  </div>
                )}
                {copyMessage?.shareId === s.id && (
                  <p className="fine" role="status">
                    {copyMessage.text}
                  </p>
                )}
              </section>
            ))}
        </section>
      ))}
    </>
  );
}
