import React, { useEffect, useRef, useState } from "react";
import type { State, Assessment, Passport } from "./contracts";
import { api, money } from "./api";
import { Logo } from "./components/Logo";
import { Report } from "./components/Report";
import { Sources } from "./components/Sources";
import { Records } from "./components/Records";
import { Assistant } from "./components/Assistant";
import { Scenario } from "./components/Scenario";
import { PassportBuilder } from "./components/PassportBuilder";
import { Settings, type Health } from "./components/Settings";
interface Identity {
  authenticated: boolean;
  name: string;
  mode: "demo" | "owner";
  authConfigured: boolean;
}
const profileOptions = [
  ["newcomer", "Alex · US newcomer"],
  ["freelancer", "Jordan · US freelancer"],
  ["farmer", "Amani · Kenya seasonal farmer"],
  ["merchant", "Sam · Kenya small merchant"],
  ["limited", "Taylor · Limited evidence"],
];
function Evidence({
  state,
  ids,
  onClose,
}: {
  state: State;
  ids: string[] | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ids && !ref.current?.open) ref.current?.showModal();
    if (!ids && ref.current?.open) ref.current.close();
  }, [ids]);
  return (
    <dialog
      ref={ref}
      className="evidence-sheet"
      aria-labelledby="evidence-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="split">
        <h2 id="evidence-title">Supporting evidence</h2>
        <button onClick={onClose} aria-label="Close supporting evidence">
          Close
        </button>
      </div>
      <p>
        These references belong to this workspace and input revision{" "}
        {state.revision}. Source facts and your interpretation are shown
        separately.
      </p>
      {ids?.map((id) => {
        const r = state.borrower.records.find((r) => r.id === id);
        return (
          <section className="evidence-row" key={id}>
            {r ? (
              <>
                <strong>{r.description}</strong>
                <p>
                  {r.date} · {money(r.amount, r.currency)} · {r.category}
                </p>
                <small>
                  Original category: {r.originalCategory} ·{" "}
                  {r.sourceLocation || "Saved synthetic source"}
                </small>
                <small>
                  {r.interpretation || "Synthetic source interpretation"}
                </small>
              </>
            ) : id === "source-closing-balance" ? (
              <>
                <strong>Documented closing liquid balance</strong>
                <p>
                  {money(
                    state.borrower.closingBalance ?? undefined,
                    state.borrower.currency,
                  )}
                </p>
                <small>
                  {state.borrower.balanceEvidence ||
                    "Synthetic balance evidence"}
                </small>
              </>
            ) : id === "source-minimum-balance" ? (
              <>
                <strong>Minimum observed month-end liquid balance</strong>
                <p>
                  {money(
                    state.borrower.minimumBalance ?? undefined,
                    state.borrower.currency,
                  )}
                </p>
                <small>
                  {state.borrower.balanceEvidence ||
                    "Synthetic balance evidence"}
                </small>
              </>
            ) : (
              <p>Evidence details are unavailable for this reference.</p>
            )}
            <small className="reference-id">{id}</small>
          </section>
        );
      })}
    </dialog>
  );
}
function Cashflow({ assessment }: { assessment: Assessment }) {
  const [rows, setRows] = useState(assessment.monthly),
    [source, setSource] = useState(
      "Calculated from the current reviewed records",
    ),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setRows(assessment.monthly);
    setError("");
    api<{ backend: string; rows: Assessment["monthly"] }>(
      "cashflow",
      "GET",
      undefined,
      controller.signal,
    )
      .then((result) => {
        setRows(result.rows);
        setSource(result.backend);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "Analytics is unavailable. Showing the current deterministic assessment summary; retry by reopening this page.",
          );
      });
    return () => controller.abort();
  }, [assessment.revision, assessment.model]);
  const scale = Math.max(...rows.flatMap((m) => [m.income, m.spending]), 1);
  return (
    <section className="card">
      <div className="split">
        <h2>Cash flow over time</h2>
        <span className="pill">{assessment.currency}</span>
      </div>
      <p>
        Income and recorded spending over the observed period. Transfers and
        borrowing are excluded from income.
      </p>
      {error && <p className="caution">{error}</p>}
      <div
        className="chart"
        role="region"
        tabIndex={0}
        aria-label="Monthly external income and spending"
      >
        {rows.map((m) => (
          <div className="month" key={m.month}>
            <div className="bars" aria-hidden="true">
              <i
                title={`Income ${money(m.income, assessment.currency)}`}
                style={{ height: `${(m.income / scale) * 100}%` }}
              />
              <i
                title={`Spending ${money(m.spending, assessment.currency)}`}
                style={{ height: `${(m.spending / scale) * 100}%` }}
              />
            </div>
            <small>{m.month.slice(2)}</small>
          </div>
        ))}
      </div>
      <p className="fine">
        <span className="legend-dot" />
        External income · <span className="legend-dot forest" />
        Spending before refunds · zero baseline.
      </p>
      <details>
        <summary>View exact monthly figures</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Spending</th>
                <th>Refunds</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{money(m.income, assessment.currency)}</td>
                  <td>{money(m.spending, assessment.currency)}</td>
                  <td>{money(m.refunds, assessment.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="fine">
        {source}. Unrecorded cash activity remains unknown.
      </p>
    </section>
  );
}
function Landing({
  selected,
  onSelected,
  onStart,
  busy,
  onAccount,
  identity,
}: {
  selected: string;
  onSelected: (id: string) => void;
  onStart: () => void;
  busy: boolean;
  onAccount: () => void;
  identity: Identity | null;
}) {
  const [preview, setPreview] = useState<Assessment | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    setError("");
    api<Assessment>(`preview/${selected}`, "GET", undefined, controller.signal)
      .then(setPreview)
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "This preview could not load. You can still open the demo and retry.",
          );
      });
    return () => controller.abort();
  }, [selected]);
  return (
    <>
      <main className="landing">
        <section>
          <div className="eyebrow">YOUR ACTIVITY TELLS A BIGGER STORY</div>
          <h1>
            Credit beyond
            <br />
            your credit
            <br />
            <em>history.</em>
          </h1>
          <p className="intro">
            Your financial life is more than a credit file. Turn the activity
            you already have into a clear, explainable alternative assessment.
            No existing credit score required.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={onAccount}>
              Build your profile <span>↗</span>
            </button>
            <a className="text-link" href="#demo-selector">
              Explore demo ↓
            </a>
          </div>
          <div id="demo-selector" className="demo-selector">
            <label htmlFor="profile">Explore a synthetic borrower</label>
            <select
              id="profile"
              value={selected}
              onChange={(e) => onSelected(e.target.value)}
            >
              {profileOptions.map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
            <button className="secondary" disabled={busy} onClick={onStart}>
              Build your demo profile ↗
            </button>
          </div>
          <p className="fine">
            {identity?.authConfigured
              ? "Private accounts use Auth0 sign-in."
              : "Private account sign-in needs server configuration; synthetic demos work now."}{" "}
            No loan approval or lender acceptance is promised.
          </p>
        </section>
        <aside className="hero-card">
          <div className="split">
            <span className="pill">A working assessment preview</span>
            <span className="preview-mark">F/</span>
          </div>
          <div className="preview-markets">
            <button
              aria-pressed={selected === "newcomer"}
              onClick={() => onSelected("newcomer")}
            >
              United States · USD
            </button>
            <button
              aria-pressed={selected === "farmer"}
              onClick={() => onSelected("farmer")}
            >
              Kenya · KES
            </button>
          </div>
          {preview ? (
            <>
              <div className="eyebrow">FOLIO CREDIT INDEX · SYNTHETIC DATA</div>
              <div className="score">
                {preview.score ?? "—"}
                <small>
                  {preview.score === null ? "More evidence needed" : "/ 100"}
                </small>
              </div>
              <h2>
                {preview.score === null
                  ? "A useful next step, not a zero."
                  : "See what is behind the number."}
              </h2>
              <p>{preview.confidence}</p>
              {preview.factors.map((f) => (
                <div className="preview-factor" key={f.name}>
                  <div>
                    <span>{f.name}</span>
                    <strong>
                      {f.points.toFixed(1)} / {f.maximum}
                    </strong>
                  </div>
                  <span className="track">
                    <i style={{ width: `${(f.points / f.maximum) * 100}%` }} />
                  </span>
                </div>
              ))}
              {preview.missing.slice(0, 2).map((m) => (
                <p className="caution" key={m}>
                  {m}
                </p>
              ))}
              <p className="fine">
                {preview.start} to {preview.end} · experimental scorecard v1.
                Calculated from the selected synthetic records.
              </p>
            </>
          ) : (
            <div className="preview-loading" role="status">
              {error || "Calculating the selected demo preview…"}
            </div>
          )}
        </aside>
      </main>
      <section className="marketing-section" id="how-it-works">
        <div className="eyebrow">A FINANCIAL RECORD THAT MAKES SENSE</div>
        <h2>
          From activity to understanding.
          <br />
          In a few clear steps.
        </h2>
        <div className="steps-grid">
          {[
            [
              "01",
              "Bring your records",
              "Use permissioned statements or a clearly labeled simulation. See source scope before processing.",
            ],
            [
              "02",
              "Review what they mean",
              "Check income, transfers and expenses. Correct an interpretation without rewriting the source.",
            ],
            [
              "03",
              "Understand and share",
              "Inspect the calculation, then issue a limited passport with an expiring, revocable link.",
            ],
          ].map(([n, title, copy]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="audience-section marketing-section">
        <div>
          <div className="eyebrow">
            DIFFERENT LIVES. THE SAME ALTERNATIVE PATHWAY.
          </div>
          <h2>
            No long credit history?
            <br />
            Start with your activity.
          </h2>
        </div>
        <div>
          <p>
            Explore a newcomer or freelancer in the United States, and seasonal
            or merchant activity in the Kenya demonstration market. Occupation,
            nationality and an absent bureau score do not determine the result.
          </p>
          <p>
            Records cannot reveal missing cash activity. When the evidence is
            incomplete, Folio explains what is needed instead of assigning a
            misleading score.
          </p>
        </div>
      </section>
      <section className="privacy-section marketing-section" id="your-data">
        <div>
          <div className="eyebrow">YOUR DATA. YOUR DECISION.</div>
          <h2>
            Permission first.
            <br />
            Clarity throughout.
          </h2>
          <p>
            You choose records, inspect the interpretation and decide what to
            share. Recipients see an immutable summary, with the model and its
            limitations intact.
          </p>
        </div>
        <div>
          <p>
            Links expire and can be revoked. A downloaded PDF cannot be
            recalled. Raw merchant histories and account identifiers stay out of
            the financial passport.
          </p>
          <button className="primary" onClick={onAccount}>
            Build your profile ↗
          </button>
          <button className="dark-outline" onClick={onStart}>
            Try the selected demo
          </button>
        </div>
      </section>
      <footer className="site-footer">
        <Logo />
        <p>
          Experimental scorecard v1. Software correctness is tested on synthetic
          cases; predictive repayment accuracy and lender acceptance have not
          been established.
        </p>
        <a href="/methodology">Methodology</a>
        <a href="/privacy">Privacy and retention</a>
      </footer>
    </>
  );
}
function App() {
  const [state, setState] = useState<State | null>(null),
    [identity, setIdentity] = useState<Identity | null>(null),
    [health, setHealth] = useState<Health | null>(null),
    [boot, setBoot] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [page, setPage] = useState("Overview"),
    [selected, setSelected] = useState("newcomer"),
    [shared, setShared] = useState<Passport | null>(null),
    [evidence, setEvidence] = useState<string[] | null>(null),
    [accountInfo, setAccountInfo] = useState(false);
  const token = location.pathname.startsWith("/shared/")
    ? location.pathname.split("/")[2]
    : null;
  const infoPage =
    location.pathname === "/methodology"
      ? "methodology"
      : location.pathname === "/privacy"
        ? "privacy"
        : null;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const init = async () => {
      if (infoPage) {
        setBoot(false);
        return;
      }
      if (token) {
        try {
          const p = await api<Passport>(
            `shared/${encodeURIComponent(token)}`,
            "GET",
            undefined,
            controller.signal,
          );
          if (active) setShared(p);
        } catch (e) {
          if (active)
            setError(
              e instanceof Error ? e.message : "This link is unavailable.",
            );
        } finally {
          if (active) setBoot(false);
        }
        return;
      }
      const results = await Promise.allSettled([
        api<Identity>("identity", "GET", undefined, controller.signal),
        api<Health>("health", "GET", undefined, controller.signal),
      ]);
      if (!active) return;
      if (results[0].status === "fulfilled") setIdentity(results[0].value);
      if (results[1].status === "fulfilled") setHealth(results[1].value);
      if (sessionStorage.getItem("folio-choose-profile")) {
        setBoot(false);
        return;
      }
      try {
        const s = await api<State>(
          "state",
          "GET",
          undefined,
          controller.signal,
        );
        if (active) {
          setState(s);
          if (s.mode === "owner" && !s.connected) setPage("Context");
        }
      } catch (e) {
        if (
          active &&
          e instanceof Error &&
          !e.message.startsWith("Start a synthetic")
        )
          setError(e.message);
      } finally {
        if (active) setBoot(false);
      }
    };
    init();
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, infoPage]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setEvidence(null);
  }, [page]);
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
  const start = () =>
    run(async () => {
      const s = await api<State>("session", "POST", { profile: selected });
      sessionStorage.removeItem("folio-choose-profile");
      setState(s);
      setPage("Records");
      setNotice("");
    });
  const account = () => {
    if (identity?.authenticated) {
      run(async () => {
        const s = await api<State>("owner/start", "POST", {});
        sessionStorage.removeItem("folio-choose-profile");
        setState(s);
        setPage(s.connected ? "Overview" : "Context");
      });
    } else if (identity?.authConfigured) {
      location.href = "/login";
    } else setAccountInfo(true);
  };
  const choose = () => {
    sessionStorage.setItem("folio-choose-profile", "1");
    setState(null);
    setEvidence(null);
    setNotice("");
  };
  if (boot)
    return (
      <main className="loading" role="status">
        <Logo />
        <p>Opening your Folio…</p>
      </main>
    );
  if (token)
    return (
      <main className="shared">
        <Logo />
        {error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : shared ? (
          <>
            <Report passport={shared} />
            <a
              className="button primary"
              href={`/api/shared/${encodeURIComponent(token)}/pdf`}
              download
            >
              Download this passport PDF ↓
            </a>
            <p className="fine">
              Read-only report. A loan decision is made by a participating
              lender, not Folio.
            </p>
          </>
        ) : (
          <p role="status">Loading passport…</p>
        )}
      </main>
    );
  if (infoPage)
    return (
      <>
        <header>
          <Logo />
          <a href="/">Back to Folio</a>
        </header>
        <main className="document-page card">
          <div className="eyebrow">
            FOLIO ·{" "}
            {infoPage === "methodology"
              ? "OUR EXPERIMENTAL MODEL"
              : "YOUR DATA"}
          </div>
          <h1>
            {infoPage === "methodology"
              ? "How the assessment works."
              : "Permission, sharing and retention."}
          </h1>
          {infoPage === "methodology" ? (
            <>
              <p>
                Folio uses an experimental deterministic scorecard on a 0–100
                scale. Higher values represent stronger assessed financial
                capacity under its formula. No traditional credit score,
                occupation prestige, nationality or sensitive identity feature
                is used.
              </p>
              <h2>Three inspectable factors</h2>
              <p>
                Capacity: 50 × clamp((income − net expenses) / income / 0.4).
                Liquidity: 30 × clamp(closing liquid balance / average monthly
                expenses / 3). Resilience: 20 × clamp(minimum month-end liquid
                balance / average monthly expenses). Each ratio is clamped to
                0–1; contributions are summed and rounded once.
              </p>
              <p>
                Ordinary profiles require at least 90 days and three complete
                months. Seasonal profiles require two full years. Required
                evidence must include meaningful coverage, classifications,
                balances and known obligations. Missing evidence produces an
                unscored result.
              </p>
              <p>
                Weights are developer hypotheses. Synthetic software tests do
                not establish predictive accuracy, general fairness or lender
                acceptance. Markets are demonstration configurations, not a
                universal approval.
              </p>
            </>
          ) : (
            <>
              <p>
                Choose the records you permit Folio to process. Raw uploads are
                held in memory; parsed previews expire after 15 minutes and are
                cleaned within the next minute while the service runs. Confirmed
                records remain until workspace deletion.
              </p>
              <p>
                Gemini processing is explicit. PDF extraction sends the selected
                PDF to the provider; explanation requests send limited metrics
                and references, excluding identity and raw merchant histories.
                Configure provider processing appropriately before real personal
                data is used.
              </p>
              <p>
                Recipients see the selected immutable report, never your live
                account. Links are opaque, expire and can be revoked. Every
                service visit and PDF download checks access. Revocation cannot
                recall downloaded copies.
              </p>
              <p>
                Workspace deletion removes application records, derived
                assessments, previews and sharing access. It does not promise
                immediate deletion from backups or external providers. A hashed
                deletion marker prevents accidental account recreation; it
                contains no financial records.
              </p>
            </>
          )}
        </main>
      </>
    );
  return (
    <>
      <header className="main-header">
        <Logo />
        {state ? (
          <>
            <span className="demo-tag">
              {state.mode === "owner"
                ? "PRIVATE ACCOUNT"
                : "SAVED SYNTHETIC DEMO"}
            </span>
            <div className="header-actions">
              {state.mode !== "owner" && identity?.authenticated && (
                <button className="quiet" onClick={account}>
                  Open private profile
                </button>
              )}
              <button className="quiet" onClick={choose}>
                Choose another profile
              </button>
              {identity?.authenticated && <a href="/logout">Log out</a>}
            </div>
          </>
        ) : (
          <>
            <nav className="marketing-nav" aria-label="Marketing">
              <a href="#how-it-works">How it works</a>
              <a href="#your-data">Your data</a>
              <button className="quiet" onClick={account}>
                {identity?.authenticated ? "My profile" : "Log in"}
              </button>
            </nav>
            <button className="primary header-start" onClick={account}>
              Build your profile
            </button>
          </>
        )}
      </header>
      {accountInfo && (
        <section className="setup-notice" role="status">
          <strong>
            Private accounts need Auth0 configuration on this server.
          </strong>
          <p>
            The synthetic demo works now. Configure the server’s local
            environment using the setup guide; never enter secrets here.
          </p>
          <button onClick={() => setAccountInfo(false)}>
            Continue exploring
          </button>
        </section>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {notice && (
        <div role="status" className="success global-notice">
          {notice}
        </div>
      )}
      {busy && (
        <div role="status" className="progress">
          Saving your changes…
        </div>
      )}
      {!state ? (
        <Landing
          selected={selected}
          onSelected={setSelected}
          onStart={start}
          busy={busy}
          onAccount={account}
          identity={identity}
        />
      ) : (
        <div className="shell">
          <nav className="app-nav" aria-label="Main navigation">
            {["Overview", "Records", "Assessment", "Report", "Settings"].map(
              (p, i) => (
                <button
                  key={p}
                  data-page={p}
                  aria-current={page === p ? "page" : undefined}
                  className={page === p ? "active" : ""}
                  onClick={() => setPage(p)}
                >
                  <span className="nav-symbol" aria-hidden="true">
                    {["◫", "≡", "↗", "▤", "⚙"][i]}
                  </span>
                  {p}
                </button>
              ),
            )}
            <div className="nav-note">
              <span className="status-dot" />
              Your records, your control.<p>No credit file required.</p>
              <small>Experimental scorecard v1</small>
            </div>
          </nav>
          <main className="workspace">
            <div className="eyebrow">{state.borrower.context}</div>
            <div className="title-row">
              <h1>
                {page === "Context"
                  ? "Start with your context."
                  : page === "Records"
                    ? "Make every record count."
                    : page === "Assessment"
                      ? "Understand your assessment."
                      : page === "Report"
                        ? "A passport you control."
                        : page === "Settings"
                          ? "Your data. Your choice."
                          : "Meet your financial picture."}
              </h1>
              <span className="pill">
                {state.borrower.currency} · revision {state.revision}
              </span>
            </div>
            {page !== "Settings" && (
              <ol className="journey" aria-label="Borrower journey">
                {[
                  ["Context", "Your context"],
                  ["Records", "Add records"],
                  ["Review", "Review"],
                  ["Assessment", "Your assessment"],
                ].map(([destination, label], i) => (
                  <li key={label}>
                    <button
                      aria-current={
                        page === destination ||
                        (destination === "Review" &&
                          page === "Records" &&
                          state.connected)
                          ? "step"
                          : undefined
                      }
                      onClick={() =>
                        setPage(
                          destination === "Review" ? "Records" : destination,
                        )
                      }
                      disabled={
                        !state.connected &&
                        ["Review", "Assessment"].includes(destination)
                      }
                    >
                      <span>{i + 1}</span>
                      {label}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {page === "Context" && (
              <Context
                state={state}
                busy={busy}
                onSave={(values) =>
                  run(async () => {
                    setState(await api<State>("context", "POST", values));
                    setPage("Records");
                  })
                }
              />
            )}
            {page === "Records" && (
              <>
                {state.connected ? (
                  <>
                    <details className="add-source-details">
                      <summary>Add or connect another source</summary>
                      <Sources
                        state={state}
                        onState={setState}
                        onSaved={async () =>
                          setState(
                            await api<State>("connect", "POST", {
                              consent: true,
                            }),
                          )
                        }
                      />
                    </details>
                    <Records
                      state={state}
                      onState={setState}
                      onAssessment={() => setPage("Assessment")}
                    />
                  </>
                ) : (
                  <Sources
                    state={state}
                    onState={setState}
                    onSaved={async () =>
                      setState(
                        await api<State>("connect", "POST", { consent: true }),
                      )
                    }
                  />
                )}
              </>
            )}
            {["Overview", "Assessment"].includes(page) &&
              (state.assessment ? (
                <>
                  <AssessmentView
                    state={state}
                    detail={page === "Assessment"}
                    onDetail={() => setPage("Assessment")}
                    onRecords={() => setPage("Records")}
                    onEvidence={setEvidence}
                  />
                  <Cashflow assessment={state.assessment} />
                  {page === "Assessment" && (
                    <Scenario assessment={state.assessment} />
                  )}
                  <Assistant
                    state={state}
                    onState={setState}
                    onEvidence={setEvidence}
                  />
                </>
              ) : (
                <section className="card empty">
                  <h2>Your assessment starts with evidence.</h2>
                  <p>
                    Add records and review their interpretation. You do not need
                    a credit score, credit card or previous loan.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setPage("Records")}
                  >
                    Add records →
                  </button>
                </section>
              ))}
            {page === "Report" &&
              (state.assessment ? (
                <PassportBuilder state={state} onState={setState} />
              ) : (
                <section className="card empty">
                  <h2>A passport needs an assessment first.</h2>
                  <p>An unscored result can also explain missing evidence.</p>
                  <button
                    className="primary"
                    onClick={() => setPage("Records")}
                  >
                    Add records →
                  </button>
                </section>
              ))}
            {page === "Settings" && (
              <Settings
                state={state}
                onState={setState}
                health={health}
                onDeleted={() => {
                  choose();
                  setNotice(
                    "Your Folio workspace, derived records and links were deleted. Downloaded copies and external provider data cannot be recalled.",
                  );
                }}
              />
            )}
            <footer>
              Folio ·{" "}
              {state.mode === "owner"
                ? "Permissioned owner workspace"
                : "Synthetic demo data"}{" "}
              · Experimental assessment. <a href="/methodology">Methodology</a>{" "}
              · <a href="/privacy">Privacy</a>
            </footer>
          </main>
          <Evidence
            state={state}
            ids={evidence}
            onClose={() => setEvidence(null)}
          />
        </div>
      )}
    </>
  );
}
function Context({
  state,
  busy,
  onSave,
}: {
  state: State;
  busy: boolean;
  onSave: (v: {
    name: string;
    currency: string;
    incomePattern: string;
  }) => void;
}) {
  const [name, setName] = useState(state.borrower.name),
    [currency, setCurrency] = useState(state.borrower.currency),
    [pattern, setPattern] = useState<string>(
      state.borrower.incomePattern ||
        (state.borrower.seasonal ? "seasonal" : "unknown"),
    );
  return (
    <section className="card narrow">
      <div className="step">01 / YOUR CONTEXT</div>
      <h2>A few details. No credit-history questions.</h2>
      <p>
        Your income pattern helps define the observation period. Your name and
        occupation labels do not contribute to the score.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ name, currency, incomePattern: pattern });
        }}
      >
        <label htmlFor="borrower-name">What should we call you?</label>
        <input
          id="borrower-name"
          value={name}
          maxLength={60}
          required
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="market">Demonstration market and currency</label>
        <select
          id="market"
          value={currency}
          disabled={state.borrower.records.length > 0 && state.connected}
          onChange={(e) => setCurrency(e.target.value as "USD" | "KES")}
        >
          <option value="USD">United States · USD</option>
          <option value="KES">Kenya · KES</option>
        </select>
        <label htmlFor="income-pattern">Your income pattern</label>
        <select
          id="income-pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        >
          <option value="unknown">Not sure yet</option>
          <option value="salary-like">Salary-like</option>
          <option value="contract-based">Contract-based / irregular</option>
          <option value="seasonal">Seasonal</option>
          <option value="mixed">Mixed sources</option>
        </select>
        <p className="fine">
          This is your declaration, not verified evidence. Seasonal assessments
          need two complete years. We never infer a profession or sensitive
          traits from merchants.
        </p>
        <button className="primary" disabled={busy}>
          Save and add records →
        </button>
      </form>
    </section>
  );
}
function AssessmentView({
  state,
  detail,
  onDetail,
  onRecords,
  onEvidence,
}: {
  state: State;
  detail: boolean;
  onDetail: () => void;
  onRecords: () => void;
  onEvidence: (ids: string[]) => void;
}) {
  const a = state.assessment!;
  return (
    <>
      <section className="assessment-grid">
        <div
          className={`score-card ${a.score === null ? "unscored-card" : ""}`}
        >
          <div className="eyebrow">FOLIO CREDIT INDEX</div>
          <div className="score">
            {a.score ?? "—"}
            <small>{a.score === null ? "More evidence needed" : "/ 100"}</small>
          </div>
          <h2>
            {a.score === null
              ? "More evidence needed"
              : "An alternative view of capacity"}
          </h2>
          <p>
            {a.score === null
              ? "Some required evidence is missing or needs clarification. This is not a zero or a judgment about you."
              : "Higher values reflect stronger assessed capacity under this experimental formula, not a probability of repayment."}
          </p>
          <button className="dark" onClick={detail ? onRecords : onDetail}>
            {detail
              ? "Inspect supporting records →"
              : "Understand your score →"}
          </button>
        </div>
        <div className="card evidence-summary">
          <div className="eyebrow">EVIDENCE, SEPARATE FROM THE SCORE</div>
          <h2>{a.confidence}</h2>
          <p>
            {a.start || "Coverage not established"} →{" "}
            {a.end || "coverage not established"}
            <br />
            (end exclusive)
          </p>
          <p>
            {a.sourceKind === "synthetic"
              ? "Saved synthetic data"
              : a.sourceKind === "sandbox"
                ? "Nessie banking simulation"
                : "User-provided financial records"}{" "}
            · {state.borrower.months} observed months
          </p>
          {a.missing.map((m) => (
            <p className="caution" key={m}>
              {m}
            </p>
          ))}
          <p className="fine">
            {a.validation}. No existing credit score was used.
          </p>
          {a.missing.length > 0 && (
            <button onClick={onRecords}>Resolve missing evidence →</button>
          )}
        </div>
      </section>
      <section className="card">
        <h2>What the records say</h2>
        <div className="metrics">
          <div>
            <small>External income</small>
            <strong>{money(a.income, a.currency)}</strong>
          </div>
          <div>
            <small>Expenses, net of refunds</small>
            <strong>{money(a.expenses, a.currency)}</strong>
          </div>
          <div>
            <small>Residual cash flow</small>
            <strong>{money(a.net, a.currency)}</strong>
          </div>
        </div>
        <p className="fine">
          Full observed period. Residual cash flow means income minus recorded
          expenses after refunds; it is not a loan limit. Unrecorded activity
          remains unknown.
        </p>
      </section>
      <section className="card">
        <h2>What drives your result</h2>
        {a.factors.length ? (
          a.factors.map((f) => (
            <button
              className="factor"
              key={f.name}
              onClick={() => onEvidence(f.evidence)}
            >
              <span>
                {f.name}
                <small>
                  Inspect the contribution and supporting evidence →
                </small>
              </span>
              <strong>
                {f.points.toFixed(2)} / {f.maximum}
              </strong>
            </button>
          ))
        ) : (
          <p>
            Factors are unavailable until required evidence is resolved. No
            score of zero is assigned.
          </p>
        )}
        {a.reasons
          ?.filter((r) => r.code !== "EVIDENCE_REQUIRED")
          .map((r) => (
            <p key={r.code} className="reason">
              {r.message}
            </p>
          ))}
        <details>
          <summary>Formula, model and limitations · {a.model}</summary>
          <p>
            Capacity: 50 × clamp(residual / income / 0.4). Liquidity: 30 ×
            clamp(closing balance / average monthly expenses / 3). Resilience:
            20 × clamp(minimum month-end balance / average monthly expenses).
            Clamp each ratio to 0–1, sum and round once to the nearest integer.
          </p>
          <p>
            Balances are separate source evidence. Corrections change
            interpretation without fabricating source balances. Seasonal
            activity uses the full observed cycle. Weights are developer
            hypotheses, not coefficients learned from repayment outcomes.{" "}
            <a href="/methodology">Read the methodology.</a>
          </p>
        </details>
      </section>
    </>
  );
}
class AppBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="shared">
        <Logo />
        <h1>Something went wrong.</h1>
        <p>
          Reload to resume your saved workspace. Your records remain on the
          server.
        </p>
        <button onClick={() => location.reload()}>Reload Folio</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function Folio() {
  return (
    <AppBoundary>
      <App />
    </AppBoundary>
  );
}
