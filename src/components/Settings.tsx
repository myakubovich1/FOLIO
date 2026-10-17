import { useState } from "react";
import type { State } from "../contracts";
import { api, displayDate } from "../api";
export interface Health {
  ok: boolean;
  storage: string;
  providers: {
    auth0: boolean;
    tiger: boolean;
    nessie: boolean;
    gemini: boolean;
  };
}
export function Settings({
  state,
  onState,
  onDeleted,
  health,
}: {
  state: State;
  onState: (s: State) => void;
  onDeleted: () => void;
  health: Health | null;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(""),
    [deleting, setDeleting] = useState(false),
    [notice, setNotice] = useState("");
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
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success">
          {notice}
        </p>
      )}
      <section className="card">
        <h2>Your sources</h2>
        <p>
          Disconnecting stops future ingestion; previously imported records
          remain in the historical assessment. Delete your Folio data below to
          remove the stored records and derived reports.
        </p>
        {state.sources?.length ? (
          state.sources.map((s) => (
            <div className="source-row" key={s.id}>
              <div>
                <strong>{s.label}</strong>
                <small>
                  {s.kind} ·{" "}
                  {s.connected
                    ? "Connected for permitted processing"
                    : "Disconnected"}{" "}
                  · {s.coverageStart} to {s.coverageEnd}
                </small>
                {s.reconciliation && <small>{s.reconciliation}</small>}
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const updated = await api<State>(
                      `sources/${encodeURIComponent(s.id)}${s.connected ? "" : "/reconnect"}`,
                      s.connected ? "DELETE" : "POST",
                      s.connected ? undefined : { consent: true },
                    );
                    onState(updated);
                    setNotice(
                      s.connected
                        ? "Source disconnected. Historical records were retained."
                        : "Source reconnected with your permission.",
                    );
                  })
                }
              >
                {s.connected ? "Disconnect source" : "Reconnect source"}
              </button>
            </div>
          ))
        ) : (
          <p>No sources yet. Add records to begin.</p>
        )}
      </section>
      <section className="card">
        <h2>Active and revoked links</h2>
        <p>
          Every visit and PDF request checks expiry and revocation. Revoking a
          link cannot recall a downloaded copy.
        </p>
        {state.shares.length ? (
          state.shares.map((s) => {
            const p = state.passports.find((p) => p.id === s.passportId);
            return (
              <div className="factor" key={s.id}>
                <span>
                  Passport revision {p?.assessment.revision ?? "unavailable"}
                  <small>
                    Generated {p ? displayDate(p.generatedAt) : "unknown"} ·
                    link {s.id.slice(0, 6)}
                  </small>
                  <small>Expires {displayDate(s.expiresAt)}</small>
                </span>
                <button
                  disabled={s.revoked || busy}
                  onClick={() =>
                    run(async () => {
                      onState(await api<State>(`shares/${s.id}`, "DELETE"));
                      setNotice(
                        "Link revoked. Future visits and downloads are blocked.",
                      );
                    })
                  }
                >
                  {s.revoked ? "Revoked" : "Revoke link"}
                </button>
              </div>
            );
          })
        ) : (
          <div className="empty">
            <p>
              No links yet. Generate a passport in Report, preview it, then
              create a link.
            </p>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Data and integration status</h2>
        <p>
          <strong>{health?.storage || "Storage status unavailable"}</strong>
        </p>
        <div className="integration-grid">
          {health &&
            Object.entries(health.providers).map(([name, configured]) => (
              <div key={name}>
                <strong>
                  {name === "tiger"
                    ? "Tiger Data"
                    : name === "auth0"
                      ? "Auth0"
                      : name === "nessie"
                        ? "Nessie"
                        : "Gemini"}
                </strong>
                <small>
                  {configured
                    ? "Configuration present; live use is verified separately"
                    : "Not configured"}
                </small>
              </div>
            ))}
        </div>
        <p className="fine">
          Saved synthetic records, banking simulation records and uploaded
          statements are labeled separately. Credentials are never entered here
          or exposed to your browser. See the local setup guide to configure the
          server.
        </p>
        {state.ingestions?.length ? (
          <details>
            <summary>Recent import activity</summary>
            {state.ingestions.slice(0, 8).map((r) => (
              <div className="activity" key={r.id}>
                <strong>
                  {r.status} · {r.accepted} accepted · {r.duplicates} duplicates
                </strong>
                <small>
                  {displayDate(r.at)} · {r.message}
                </small>
              </div>
            ))}
          </details>
        ) : null}
        <h3>Retention and deletion</h3>
        <p>
          Raw uploads are processed in memory. Parsed previews expire after 15
          minutes and are cleaned from the application database. Imported
          records remain until you delete them. Application deletion removes
          derived assessments and sharing access; it does not promise immediate
          erasure from provider systems or backups.
        </p>
        <button className="danger" onClick={() => setDeleting(!deleting)}>
          Delete my Folio data
        </button>
        {deleting && (
          <div className="delete-confirm">
            <label htmlFor="delete-confirm">
              Type DELETE to remove this workspace and revoke its links
            </label>
            <input
              id="delete-confirm"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button
              className="danger"
              disabled={busy || confirm !== "DELETE"}
              onClick={() =>
                run(async () => {
                  await api("data", "DELETE", { confirm: "DELETE" });
                  onDeleted();
                })
              }
            >
              Permanently delete workspace data
            </button>
          </div>
        )}
      </section>
    </>
  );
}
