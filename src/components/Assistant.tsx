import { useState } from "react";
import type { State, Explanation } from "../contracts";
import { api } from "../api";
export function Assistant({
  state,
  onState,
  onEvidence,
}: {
  state: State;
  onState: (s: State) => void;
  onEvidence: (ids: string[]) => void;
}) {
  const [question, setQuestion] = useState(
      "How was my alternative score calculated?",
    ),
    [gemini, setGemini] = useState(false),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const explanation =
    state.explanation?.revision === state.revision ? state.explanation : null;
  async function ask(q = question) {
    setQuestion(q);
    setBusy(true);
    setError("");
    try {
      const result = await api<{ state: State; explanation: Explanation }>(
        "explanation",
        "POST",
        { question: q, provider: gemini ? "gemini" : "deterministic", consent },
      );
      onState(result.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card assistant">
      <div className="eyebrow">YOUR EVIDENCE, EXPLAINED</div>
      <h2>Make sense of the result.</h2>
      <p>
        Ask about the current assessment, excluded transfers or missing
        evidence. Financial figures come from the calculation, and supporting
        records stay inspectable.
      </p>
      <div className="question-chips">
        {[
          "How was my alternative score calculated?",
          "Which transfers were excluded?",
          "Why does my income look seasonal?",
          "Which missing records prevent an assessment?",
          "What could improve this model result?",
        ].map((q) => (
          <button disabled={busy} key={q} onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <label htmlFor="evidence-question">Your question</label>
        <textarea
          id="evidence-question"
          rows={2}
          maxLength={500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={gemini}
            onChange={(e) => setGemini(e.target.checked)}
          />
          Use Gemini for an explanation grounded in my records.
        </label>
        {gemini && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Send only the current metrics and limited record references to
            Gemini. Identity and raw merchant descriptions are excluded.
          </label>
        )}
        <button
          className="primary"
          disabled={busy || !question.trim() || (gemini && !consent)}
        >
          {busy ? "Checking your evidence…" : "Explain my evidence"}
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error} You can turn off Gemini and request the calculated
          explanation.
        </p>
      )}
      {busy && (
        <p role="status">
          Retrieving the current revision and validating the explanation…
        </p>
      )}
      {explanation && (
        <div className="explanation">
          <div className="pill">
            {explanation.provider === "gemini"
              ? "Gemini-grounded explanation"
              : "Calculated explanation · no AI request"}{" "}
            · revision {explanation.revision}
          </div>
          {explanation.paragraphs.map((p, i) => (
            <section key={i}>
              <p>{p.text}</p>
              {p.evidence.length > 0 && (
                <button
                  className="text-link"
                  onClick={() => onEvidence(p.evidence)}
                >
                  Inspect {p.evidence.length} supporting references →
                </button>
              )}
            </section>
          ))}
          <p className="fine">{explanation.limitation}</p>
        </div>
      )}
    </section>
  );
}
