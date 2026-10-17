import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export interface FlowStep {
  id: string;
  label: string;
  icon: IconName;
  status: string;
  tone?: "attention" | "ready";
  detail: ReactNode;
  action?: ReactNode;
}

function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = Array.from(
    event.currentTarget
      .closest('[role="tablist"]')!
      .querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const index = tabs.indexOf(event.currentTarget);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  tabs[next]?.focus();
}

/** Ordered, inspectable flow: arrow keys follow process order, including on mobile. */
export function FlowExplorer({
  title,
  intro,
  steps,
  initialStep,
  variant = "default",
}: {
  title: string;
  intro: string;
  steps: FlowStep[];
  initialStep?: string;
  variant?: "default" | "landing";
}) {
  const id = useId();
  const [selected, setSelected] = useState(initialStep ?? steps[0]?.id);
  const current = steps.find((step) => step.id === selected) ?? steps[0];
  if (!current) return null;
  return (
    <section
      className={`flow-explorer flow-explorer-${variant}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="flow-heading">
        <div>
          <div className="eyebrow">FOLLOW THE STORY</div>
          <h2 id={`${id}-heading`}>{title}</h2>
          <p>{intro}</p>
        </div>
        <span className="flow-hint">
          <Icon name="overview" /> Select a step to explore
        </span>
      </div>
      <div className="flow-track" role="tablist" aria-label={title}>
        {steps.map((step, index) => (
          <div className="flow-node-wrap" role="presentation" key={step.id}>
            <button
              className="flow-node"
              role="tab"
              id={`${id}-${step.id}`}
              aria-selected={current.id === step.id}
              aria-controls={`${id}-panel`}
              tabIndex={current.id === step.id ? 0 : -1}
              onFocus={() => setSelected(step.id)}
              onClick={() => setSelected(step.id)}
              onKeyDown={moveTab}
            >
              <span className="flow-node-top">
                <Icon name={step.icon} />
                <span className="flow-number" aria-hidden="true">
                  0{index + 1}
                </span>
              </span>
              <span className="flow-node-label">{step.label}</span>
              <span
                className={`flow-node-status ${step.tone === "attention" ? "flow-attention" : ""}`}
              >
                {step.status}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span className="flow-connector" aria-hidden="true">
                <Icon name="arrow" />
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        className="flow-panel"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${current.id}`}
        tabIndex={0}
      >
        <div className="flow-panel-copy" key={current.id}>
          <h3>{current.label}</h3>
          {current.detail}
          {current.action && (
            <div className="flow-panel-action">{current.action}</div>
          )}
        </div>
      </div>
    </section>
  );
}
