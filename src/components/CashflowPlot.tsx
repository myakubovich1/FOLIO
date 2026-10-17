import { useId, useState, type KeyboardEvent } from "react";
import type { Assessment } from "../contracts";
import { money } from "../api";

const monthLabel = (month: string, short = false) =>
  new Intl.DateTimeFormat("en-US", {
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

function navigateMonth(event: KeyboardEvent<HTMLButtonElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const buttons = Array.from(
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      ".plot-month",
    ) ?? [],
  );
  const index = buttons.indexOf(event.currentTarget);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : Math.max(
            0,
            Math.min(
              buttons.length - 1,
              index + (event.key === "ArrowRight" ? 1 : -1),
            ),
          );
  buttons[next]?.focus();
}

export function CashflowPlot({
  rows,
  currency,
  incomplete,
}: {
  rows: Assessment["monthly"];
  currency: string;
  incomplete: boolean;
}) {
  const [selected, setSelected] = useState("");
  const hintId = useId();
  const current = rows.find((row) => row.month === selected) ?? rows[0];
  const scale = Math.max(
    ...rows.flatMap((row) => [row.income, row.spending]),
    1,
  );
  const axis = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount / 100);
  if (!current)
    return (
      <p className="caution">
        No monthly records are available yet. Add records to see your cash-flow
        history.
      </p>
    );
  return (
    <figure className="cashflow-figure">
      <div className="cashflow-legend">
        <span>
          <i className="legend-dot" />
          External income
        </span>
        <span>
          <i className="legend-dot forest" />
          Spending before refunds
        </span>
        <span className="plot-period">{rows.length} recorded months</span>
      </div>
      {incomplete && (
        <p className="fine">
          Partial records: empty bars do not mean no activity. Missing or
          unclassified transactions are not represented.
        </p>
      )}
      <div className="cashflow-plot">
        <div className="plot-axis" aria-hidden="true">
          <span>{axis(scale)}</span>
          <span>{axis(scale / 2)}</span>
          <span>0</span>
        </div>
        <div
          className="cashflow-scroll"
          role="region"
          tabIndex={0}
          aria-label="Monthly external income and spending"
          aria-describedby={hintId}
        >
          <div
            className="plot-months"
            style={{ minWidth: `${rows.length * 48}px` }}
            role="toolbar"
            aria-label="Choose a cash-flow month"
          >
            <div className="plot-guides" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            {rows.map((row) => (
              <button
                key={row.month}
                className="plot-month"
                aria-label={`View ${monthLabel(row.month)} cash flow`}
                aria-pressed={current.month === row.month}
                tabIndex={current.month === row.month ? 0 : -1}
                onClick={() => setSelected(row.month)}
                onFocus={() => setSelected(row.month)}
                onKeyDown={navigateMonth}
              >
                <span className="plot-bars" aria-hidden="true">
                  <i style={{ height: `${(row.income / scale) * 100}%` }} />
                  <i style={{ height: `${(row.spending / scale) * 100}%` }} />
                </span>
                <span className="plot-month-label" aria-hidden="true">
                  {monthLabel(row.month, true)}
                  <small>{row.month.slice(0, 4)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <figcaption id={hintId}>
        Amounts in {currency} · shared scale, zero baseline. Select a month for
        exact figures, or use the left and right arrow keys.
      </figcaption>
      <div
        className="month-inspector"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <strong className="inspector-month">{monthLabel(current.month)}</strong>
        <dl>
          <div>
            <dt>External income</dt>
            <dd>{money(current.income, currency)}</dd>
          </div>
          <div>
            <dt>Recorded spending</dt>
            <dd>{money(current.spending, currency)}</dd>
          </div>
          <div>
            <dt>Refunds, shown separately</dt>
            <dd>{money(current.refunds, currency)}</dd>
          </div>
        </dl>
      </div>
    </figure>
  );
}
