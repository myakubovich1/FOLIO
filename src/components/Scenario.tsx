import { useState } from "react";
import type { Assessment } from "../contracts";
import { api } from "../api";
export function Scenario({ assessment }: { assessment: Assessment }) {
  const [reduction, setReduction] = useState(0),
    [balance, setBalance] = useState("0"),
    [result, setResult] = useState<Assessment | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="card">
      <div className="eyebrow">A CONDITIONAL CALCULATION</div>
      <h2>Explore what changes the result.</h2>
      <p>
        Adjust recorded expenses or the closing liquid balance. This does not
        change your records or issued passport, and it cannot supply missing
        evidence.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const r = await api<{ assessment: Assessment }>(
              "scenario",
              "POST",
              { expenseReduction: reduction, balanceIncrease: balance },
            );
            setResult(r.assessment);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Retry the scenario.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <div>
            <label htmlFor="scenario-expenses">
              Reduce recorded expenses: {reduction}%
            </label>
            <input
              id="scenario-expenses"
              type="range"
              min="0"
              max="50"
              value={reduction}
              onChange={(e) => {
                setReduction(Number(e.target.value));
                setResult(null);
              }}
            />
          </div>
          <div>
            <label htmlFor="scenario-balance">
              Add to closing liquid balance ({assessment.currency})
            </label>
            <input
              id="scenario-balance"
              inputMode="decimal"
              pattern="[0-9]+(\.[0-9]{1,2})?"
              value={balance}
              onChange={(e) => {
                setBalance(e.target.value);
                setResult(null);
              }}
            />
          </div>
        </div>
        <button
          className="primary"
          disabled={busy || assessment.score === null}
        >
          {busy ? "Recalculating…" : "Calculate scenario"}
        </button>
        {assessment.score === null && (
          <p className="fine">
            Resolve the missing evidence before comparing scored scenarios.
          </p>
        )}
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="scenario-result" role="status">
          <strong>
            {result.score ?? "More evidence needed"}
            {result.score === null ? "" : " / 100"}
          </strong>
          <p>
            Conditional model result. Your issued index remains{" "}
            {assessment.score ?? "unscored"}. This is not a forecast or loan
            offer.
          </p>
        </div>
      )}
    </section>
  );
}
