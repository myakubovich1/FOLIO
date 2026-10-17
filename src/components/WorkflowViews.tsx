import type { State } from "../contracts";
import { FlowExplorer, type FlowStep } from "./FlowExplorer";
import { JourneyArt } from "./Infographics";
import { Icon } from "./Icon";

export function JourneyExplorer({
  onStart,
  busy,
}: {
  onStart: () => void;
  busy: boolean;
}) {
  const detail = (
    kind: "records" | "review" | "passport",
    copy: string,
    note: string,
  ) => (
    <div className="journey-detail">
      <div className={`journey-detail-art illustrated-step-${kind}`}>
        <div className="journey-art">
          <JourneyArt kind={kind} />
        </div>
      </div>
      <div>
        <p>{copy}</p>
        <p className="fine">{note}</p>
      </div>
    </div>
  );
  const steps: FlowStep[] = [
    {
      id: "records",
      label: "Bring records",
      icon: "records",
      status: "Permission first",
      detail: detail(
        "records",
        "Choose a saved synthetic example, permissioned statement or supported banking sandbox. You see the source and its limits before processing.",
        "The demo needs no bank login. Nessie records are explicitly sandbox data.",
      ),
    },
    {
      id: "review",
      label: "Review meaning",
      icon: "settings",
      status: "You can correct it",
      detail: detail(
        "review",
        "Separate earnings from transfers, borrowing and refunds. Correct an interpretation while the original record stays intact.",
        "Corrections create a new revision and recalculate the result; they never rewrite source balances.",
      ),
    },
    {
      id: "assessment",
      label: "Understand it",
      icon: "trend",
      status: "Evidence before an index",
      detail: detail(
        "review",
        "Follow the recorded income, expenses and balance evidence into three fixed factors. If required evidence is missing, Folio explains the gap instead of assigning a zero.",
        "An experimental index is not an approval, a loan limit or a repayment probability.",
      ),
    },
    {
      id: "passport",
      label: "Share selectively",
      icon: "report",
      status: "Expiry and revocation",
      detail: detail(
        "passport",
        "Preview a limited financial passport, choose optional detail and issue an immutable snapshot. Share it using a read-only link you can expire or revoke.",
        "Raw records and account identifiers stay out. Copies already downloaded cannot be recalled.",
      ),
      action: (
        <button className="primary" disabled={busy} onClick={onStart}>
          Explore the selected demo <Icon name="arrow" />
        </button>
      ),
    },
  ];
  return (
    <FlowExplorer
      variant="landing"
      title="Your path from records to possibility."
      intro="Explore each step before you begin. You stay in control of the records, their interpretation and what gets shared."
      steps={steps}
    />
  );
}

export function NextStep({
  state,
  onRecords,
  onReport,
}: {
  state: State;
  onRecords: () => void;
  onReport: () => void;
}) {
  const assessment = state.assessment;
  if (!assessment) return null;
  const needsEvidence =
    assessment.score === null || assessment.missing.length > 0;
  const currentPassport = state.passports.some(
    (p) => p.assessment.revision === state.revision,
  );
  const title = needsEvidence
    ? "A clearer picture starts with the missing evidence."
    : currentPassport
      ? "Your passport is ready for a closer look."
      : "Turn this picture into a financial passport.";
  return (
    <section className="next-step" aria-label="Your next step">
      <span className="next-step-icon">
        <Icon name={needsEvidence ? "records" : "report"} />
      </span>
      <div>
        <span className="eyebrow">YOUR NEXT STEP</span>
        <h2>{title}</h2>
        <p>
          {needsEvidence
            ? "An unscored passport can still explain your evidence gaps."
            : currentPassport
              ? `A snapshot of input revision ${state.revision} has been issued. Choose what to share next.`
              : "Preview exactly what a recipient can see before issuing a snapshot."}
        </p>
      </div>
      <button
        className="primary"
        onClick={needsEvidence ? onRecords : onReport}
      >
        {needsEvidence
          ? "Review missing evidence"
          : currentPassport
            ? "Open your passport"
            : "Prepare your passport"}
        <Icon name="arrow" />
      </button>
    </section>
  );
}

export function EvidenceFlow({
  state,
  onRecords,
  onReport,
}: {
  state: State;
  onRecords: () => void;
  onReport: () => void;
}) {
  const a = state.assessment;
  if (!a) return null;
  const records = state.borrower.records;
  const unresolved = records.filter(
    (r) =>
      r.status !== "pending" && !r.excludedReason && r.category === "unknown",
  ).length;
  const source =
    a.sourceKind === "synthetic"
      ? "Saved synthetic data"
      : a.sourceKind === "sandbox"
        ? "Nessie sandbox data"
        : a.sourceKind === "self-reported"
          ? "Self-reported data"
          : a.sourceKind === "uploaded"
            ? "Uploaded financial records"
            : "Source not established";
  const complete = a.score !== null && a.missing.length === 0;
  const current = state.passports.filter(
    (p) => p.assessment.revision === state.revision,
  ).length;
  const steps: FlowStep[] = [
    {
      id: "source",
      label: "Source records",
      icon: "records",
      status: `${records.length} in this workspace`,
      detail: (
        <>
          <span className="pill">{source}</span>
          <p>
            These are the records available to this workspace, before
            interpretation. Pending or excluded records do not enter the
            calculation.
          </p>
          <p className="fine">
            The presence of a record does not establish complete coverage or
            verify a bank account.
          </p>
        </>
      ),
      action: (
        <button className="secondary" onClick={onRecords}>
          Open source records <Icon name="arrow" />
        </button>
      ),
    },
    {
      id: "interpretation",
      label: "Interpretation",
      icon: "settings",
      status: `${unresolved} unclassified`,
      tone: unresolved ? "attention" : undefined,
      detail: (
        <>
          <p>
            <strong>{state.corrections?.length ?? 0} saved corrections</strong>{" "}
            in this workspace. Original values stay separate from the reviewed
            categories.
          </p>
          <p>
            {unresolved
              ? `${unresolved} posted, included records still need a category.`
              : "No posted, included records have an unknown category. Coverage, directions, balances and obligations still require their own checks."}
          </p>
          <p className="fine">
            Transfers and borrowing are excluded from income. Refunds offset
            recorded spending.
          </p>
        </>
      ),
      action: (
        <button className="secondary" onClick={onRecords}>
          Review classifications <Icon name="arrow" />
        </button>
      ),
    },
    {
      id: "calculation",
      label: "Assessment",
      icon: "trend",
      status: complete ? `Index ${a.score} / 100` : "Needs evidence",
      tone: complete ? "ready" : "attention",
      detail: (
        <>
          <div
            className="decision-fork"
            aria-label="Assessment evidence decision"
          >
            <div className={complete ? "decision-current" : ""}>
              <span>Required evidence present</span>
              <strong>
                {complete
                  ? `Experimental index: ${a.score} / 100`
                  : "Index only after checks pass"}
              </strong>
            </div>
            <span className="decision-or" aria-hidden="true">
              or
            </span>
            <div className={!complete ? "decision-current" : ""}>
              <span>Missing or unresolved evidence</span>
              <strong>
                {complete ? "Would remain unscored" : "No index assigned"}
              </strong>
            </div>
          </div>
          {!complete && (
            <ul className="flow-evidence-gaps">
              {a.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <p className="fine">
            The fixed formula runs on input revision {a.revision}. Evidence
            confidence is separate. No repayment-outcome accuracy has been
            established.
          </p>
        </>
      ),
    },
    {
      id: "snapshot",
      label: "Passport",
      icon: "report",
      status: current
        ? `${current} at this revision`
        : "Not issued at this revision",
      detail: (
        <>
          <p>
            Issuing freezes a limited summary of input revision {state.revision}
            . Later corrections change the current assessment, not earlier
            snapshots.
          </p>
          <p>
            {complete
              ? "The experimental index and its limitations remain visible."
              : "An unscored passport preserves the missing-evidence explanation; it does not invent a number."}
          </p>
          <p className="fine">
            Raw records, identity and account identifiers are excluded. Choose
            optional totals and factors in the preview.
          </p>
        </>
      ),
      action: (
        <button className="primary" onClick={onReport}>
          Explore passport options <Icon name="arrow" />
        </button>
      ),
    },
  ];
  return (
    <div className="card evidence-flow-card">
      <FlowExplorer
        title="Trace your result, step by step."
        intro="A view of this workspace’s actual records and input revision. Select a node to see what happens at that boundary."
        steps={steps}
      />
    </div>
  );
}

export function SharingFlow({
  state,
  factors,
  cashflow,
  days,
  previewState,
  onPreview,
}: {
  state: State;
  factors: boolean;
  cashflow: boolean;
  days: number;
  previewState: "loading" | "ready" | "unavailable";
  onPreview: () => void;
}) {
  const now = Date.now();
  const active = state.shares.filter(
    (s) => !s.revoked && Date.parse(s.expiresAt) > now,
  ).length;
  const revoked = state.shares.filter((s) => s.revoked).length;
  const steps: FlowStep[] = [
    {
      id: "workspace",
      label: "Your workspace",
      icon: "records",
      status: "Raw records stay private",
      detail: (
        <p>
          The source records support your assessment. Your identity, account
          identifiers and raw transaction history are excluded from the passport
          response.
        </p>
      ),
    },
    {
      id: "snapshot",
      label: "Snapshot",
      icon: "report",
      status: `${state.passports.length} issued`,
      detail: (
        <>
          <p>
            The next snapshot uses your current optional-detail choices.
            Already-issued snapshots keep their original selections and input
            revision.
          </p>
          <p className="fine">
            The index or unscored result, source type, coverage, evidence
            confidence, model and limitations always remain.
          </p>
        </>
      ),
    },
    {
      id: "link",
      label: "Read-only link",
      icon: "arrow",
      status: `${active} active · ${revoked} revoked`,
      detail: (
        <>
          <p>
            New links use the selected <strong>{days}-day lifetime</strong>. The
            counts above cover all issued passports in this workspace; expired
            links are not counted as active.
          </p>
          <div className="sharing-branches">
            <span>
              <Icon name="arrow" /> Active and unexpired → recipient access
            </span>
            <span>
              <Icon name="settings" /> Revoked or expired → future access denied
            </span>
          </div>
          <p className="fine">
            Every page and PDF request checks the link. Downloaded copies cannot
            be recalled.
          </p>
        </>
      ),
    },
    {
      id: "recipient",
      label: "Recipient view",
      icon: "overview",
      status:
        previewState === "ready"
          ? "Preview ready"
          : previewState === "loading"
            ? "Updating preview"
            : "Preview unavailable",
      detail: (
        <>
          <div className="disclosure-preview">
            <span>
              <Icon name="trend" />
              Factor breakdown
              <strong>{factors ? "Included" : "Excluded"}</strong>
            </span>
            <span>
              <Icon name="income" />
              Cash-flow totals
              <strong>{cashflow ? "Included" : "Excluded"}</strong>
            </span>
          </div>
          <p className="fine">
            These choices describe the next snapshot. Inspect the actual
            recipient preview before issuing it.
          </p>
        </>
      ),
      action: (
        <button
          className="secondary"
          disabled={previewState !== "ready"}
          onClick={onPreview}
        >
          Inspect recipient preview <Icon name="arrow" />
        </button>
      ),
    },
  ];
  return (
    <FlowExplorer
      title="See how sharing works."
      intro="Explore what stays private, what freezes in a snapshot and how access ends."
      steps={steps}
    />
  );
}
