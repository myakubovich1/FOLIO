import type { Passport } from "../contracts";
import { money, displayDate } from "../api";
export function Report({ passport: p }: { passport: Passport }) {
  const a = p.assessment;
  return (
    <article className="report">
      <div className="eyebrow">
        FINANCIAL PASSPORT ·{" "}
        {a.sourceKind === "synthetic"
          ? "SYNTHETIC DEMO"
          : a.sourceKind === "sandbox"
            ? "BANKING SIMULATION"
            : "PERMISSIONED RECORDS"}
      </div>
      <h2>
        Your activity.
        <br />A clearer financial picture.
      </h2>
      <div className="score">
        {a.score ?? "—"}
        <small>{a.score === null ? "More evidence needed" : "/ 100"}</small>
      </div>
      <h3>Folio Credit Index</h3>
      <p className="fine">{a.validation}</p>
      <section className="report-context">
        <strong>Evidence confidence</strong>
        <p>{a.confidence}</p>
        <small>
          Coverage: {a.start || "Not established"} to{" "}
          {a.end || "not established"} (end exclusive). Currency: {a.currency}.
        </small>
      </section>
      {p.disclosure?.cashflow !== false && (
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
      )}
      {a.factors.length > 0 && (
        <section>
          <h3>What contributes to the index</h3>
          {a.factors.map((f) => (
            <div className="factor report-factor" key={f.name}>
              <span>{f.name}</span>
              <strong>
                {f.points.toFixed(2)} / {f.maximum}
              </strong>
            </div>
          ))}
        </section>
      )}
      {a.missing.map((m) => (
        <p className="caution" key={m}>
          {m}
        </p>
      ))}
      <p className="fine">{p.source}</p>
      {p.apiProvenance && (
        <section className="report-context">
          <strong>Nessie API evidence</strong>
          <p>
            {p.apiProvenance.records} normalized records across{" "}
            {p.apiProvenance.accounts} accounts. Read{" "}
            {displayDate(p.apiProvenance.readAt)}.
          </p>
          <small>{p.apiProvenance.note}</small>
        </section>
      )}
      <p className="fine">
        Model {a.model} · input revision {a.revision} · generated{" "}
        {displayDate(p.generatedAt)}.
      </p>
      <p className="fine">{p.limitations}</p>
    </article>
  );
}
