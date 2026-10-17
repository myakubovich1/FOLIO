import { useMemo, useState } from "react";
import type { State, Category } from "../contracts";
import { api, money } from "../api";
const categories: Category[] = [
  "income",
  "expense",
  "transfer",
  "borrowing",
  "refund",
  "unknown",
];
export function Records({
  state,
  onState,
  onAssessment,
}: {
  state: State;
  onState: (s: State) => void;
  onAssessment: () => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [aiConsent, setAiConsent] = useState(false);
  const rows = useMemo(
    () =>
      state.borrower.records.filter(
        (r) =>
          (filter === "all" || r.category === filter) &&
          `${r.description} ${r.date} ${r.id}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [state.borrower.records, filter, query],
  );
  async function correct(id: string, category: Category) {
    setBusy(id);
    setError("");
    try {
      const s = await api<State>(`records/${encodeURIComponent(id)}`, "PATCH", {
        category,
      });
      onState(s);
      setNotice(
        `Saved your correction. Assessment revision ${s.revision} was recalculated; the original source value is preserved.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry this correction.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="card records">
      <div className="split">
        <div>
          <div className="step">03 / REVIEW</div>
          <h2>Make every record count.</h2>
          <p>
            Inspect the source, confirm the interpretation, and correct what
            needs attention.
          </p>
        </div>
        <button className="primary" onClick={onAssessment}>
          See assessment →
        </button>
      </div>
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="record-tools">
        <div>
          <label htmlFor="search">Search descriptions or dates</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div>
          <label htmlFor="record-filter">Filter records</label>
          <select
            id="record-filter"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All interpretations</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setFilter("unknown");
            setQuery("");
            setPage(0);
          }}
        >
          Review unresolved (
          {
            state.borrower.records.filter(
              (r) =>
                r.category === "unknown" &&
                !r.excludedReason &&
                r.status !== "pending",
            ).length
          }
          )
        </button>
      </div>
      {state.borrower.records.some((r) =>
        r.description.startsWith("Returned deposit"),
      ) && (
        <p className="caution">
          Review opportunity: “Returned deposit” was initially interpreted as
          income. Check its purpose and choose transfer or refund if
          appropriate.
        </p>
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
            {rows.slice(page * 50, (page + 1) * 50).map((r) => (
              <tr key={r.id}>
                <td data-label="Date / source">
                  {r.date}
                  <small>{r.sourceLocation || r.id}</small>
                  <small>
                    {r.status || "posted"} ·{" "}
                    {r.interpretation || "synthetic source"}
                  </small>
                </td>
                <td data-label="Description">
                  {r.description}
                  <small>Original category: {r.originalCategory}</small>
                  {r.excludedReason && (
                    <small className="record-note">{r.excludedReason}</small>
                  )}
                  {r.recordType === "withdrawal" && (
                    <small>Cash use after withdrawal is unknown.</small>
                  )}
                </td>
                <td data-label="Amount" className="amount">
                  {money(r.amount, r.currency)}
                </td>
                <td data-label="Interpretation">
                  <select
                    aria-label={`Category for ${r.id}`}
                    disabled={Boolean(busy)}
                    value={r.category}
                    onChange={(e) => correct(r.id, e.target.value as Category)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {r.suggestion && (
                    <div className="suggestion">
                      <small>
                        Suggested: {r.suggestion.category} ·{" "}
                        {r.suggestion.reason}
                      </small>
                      <button
                        disabled={Boolean(busy)}
                        onClick={() => correct(r.id, r.suggestion!.category)}
                      >
                        Confirm suggestion
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <h3>No matching records.</h3>
          <p>No matching records. Clear your search to see all records.</p>
          <button
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
          >
            Show all records
          </button>
        </div>
      ) : (
        <div className="pagination">
          <small>
            Showing {page * 50 + 1}–{Math.min((page + 1) * 50, rows.length)} of{" "}
            {rows.length} records
          </small>
          <button disabled={page === 0} onClick={() => setPage((n) => n - 1)}>
            Previous
          </button>
          <button
            disabled={(page + 1) * 50 >= rows.length}
            onClick={() => setPage((n) => n + 1)}
          >
            Next
          </button>
        </div>
      )}
      <details>
        <summary>Get classification suggestions from Gemini</summary>
        <p>
          Only broad financial keywords, dates, amounts and record references
          for unresolved records are sent. Suggestions are not facts and require
          your confirmation.
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={aiConsent}
            onChange={(e) => setAiConsent(e.target.checked)}
          />
          I agree to this limited AI processing.
        </label>
        <button
          disabled={!aiConsent || Boolean(busy)}
          onClick={async () => {
            setBusy("suggestions");
            setError("");
            try {
              onState(
                await api<State>("classifications", "POST", { consent: true }),
              );
              setNotice(
                "Suggestions are ready. Review and confirm them individually.",
              );
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Suggestions are unavailable. You can correct categories manually.",
              );
            } finally {
              setBusy("");
            }
          }}
        >
          Suggest unresolved classifications
        </button>
        <button
          disabled={!aiConsent || Boolean(busy)}
          onClick={async () => {
            setBusy("pattern");
            setError("");
            try {
              onState(
                await api<State>("income-pattern", "POST", { consent: true }),
              );
              setNotice(
                "Review the suggested pattern; it has not changed your assessment.",
              );
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Review your income pattern manually.",
              );
            } finally {
              setBusy("");
            }
          }}
        >
          Suggest income pattern
        </button>
        {state.patternSuggestion?.revision === state.revision && (
          <section className="caution">
            <p>
              Suggested pattern: {state.patternSuggestion.pattern}. This is an
              interpretation of timing, not a profession.
            </p>
            <p>
              {state.patternSuggestion.evidence.length} supporting income
              records. Confirming seasonal income requires two complete years.
            </p>
            <details>
              <summary>Inspect supporting income records</summary>
              {state.patternSuggestion.evidence.map((id) => {
                const r = state.borrower.records.find((r) => r.id === id);
                return (
                  <p key={id}>
                    {r
                      ? `${r.date} · ${money(r.amount, r.currency)} · ${r.description}`
                      : id}
                  </p>
                );
              })}
            </details>
            <button
              disabled={Boolean(busy)}
              onClick={async () => {
                setBusy("confirm-pattern");
                try {
                  onState(
                    await api<State>("context", "POST", {
                      name: state.borrower.name,
                      currency: state.borrower.currency,
                      incomePattern: state.patternSuggestion!.pattern,
                    }),
                  );
                  setNotice(
                    "Income pattern confirmed and assessment recalculated.",
                  );
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Please retry.");
                } finally {
                  setBusy("");
                }
              }}
            >
              Confirm suggested pattern
            </button>
          </section>
        )}
      </details>
    </section>
  );
}
