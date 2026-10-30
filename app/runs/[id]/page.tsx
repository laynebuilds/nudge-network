"use client";

import { use, useEffect, useState } from "react";
import type { Run } from "../../../lib/runs";

const STAGES = ["negotiating", "mediating", "ratifying", "scoring", "done"];
const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<Run | null>(null);
  const [view, setView] = useState<string>("judges");

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetch(`/api/runs/${id}`, { cache: "no-store" });
      if (!res.ok || !alive) return;
      const r = (await res.json()) as Run;
      setRun(r);
      if (r.stage !== "done" && r.stage !== "error") setTimeout(tick, 2000);
    };
    tick();
    return () => {
      alive = false;
    };
  }, [id]);

  if (!run) return <p className="muted">Loading...</p>;
  const sideOf = (owner: string) => (owner === run.a.id ? "a" : "b");
  const o = run.result?.outcome;

  return (
    <>
      <section className="card">
        <h1>
          {run.a.name} x {run.b.name}
        </h1>
        <p className="muted">{run.goal}</p>
        <div className="stages">
          {STAGES.map((s) => (
            <span key={s} className={`pill ${run.stage === s ? "on" : STAGES.indexOf(s) < STAGES.indexOf(run.stage) ? "past" : ""}`}>
              {s}
            </span>
          ))}
          {run.stage === "revising" && <span className="pill on">revising after objections</span>}
        </div>
        {run.error && <p className="error">{run.error}</p>}
        <div className="tabs">
          {[run.a, run.b].map((f) => (
            <button key={f.id} className={view === f.id ? "active" : ""} onClick={() => setView(f.id)}>
              View as {f.name}
            </button>
          ))}
          <button className={view === "judges" ? "active" : ""} onClick={() => setView("judges")}>
            Judges view
          </button>
        </div>
      </section>

      {o && run.result && (
        <section className="card">
          <span className={`pill verdict ${o.verdict}`}>{o.verdict.replace("_", " ")}</span>
          <h2>{o.headline}</h2>
          <table className="terms">
            <tbody>
              {o.proposal.map((p) => (
                <tr key={p.term}>
                  <th>{p.term}</th>
                  <td>{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Why</h3>
          <p>{o.reasoning}</p>
          <div className="pair">
            <div>
              <h3>{run.a.name} gains</h3>
              <ul>{o.gains.a.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
            <div>
              <h3>{run.b.name} gains</h3>
              <ul>{o.gains.b.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          </div>
          <h3>Constraints the twins held</h3>
          <ul>
            {o.constraints_respected.map((c, i) => (
              <li key={i}>
                <b>{c.owner === "a" ? run.a.name : run.b.name}:</b> {c.constraint} <span className="muted">({c.how})</span>
              </li>
            ))}
          </ul>
          <h3>Needs a human</h3>
          <ul>
            {o.unresolved
              .filter((u) => view === "judges" || u.for_owner === "both" || u.for_owner === sideOf(view))
              .map((u, i) => (
                <li key={i}>
                  {u.question} <span className="muted">({u.why})</span>
                </li>
              ))}
          </ul>
          <h3>Twin ratification{run.result.revised ? " (after one revision)" : ""}</h3>
          <ul>
            {(["a", "b"] as const).map((s) => {
              const r = run.result!.ratifications[s];
              return (
                <li key={s}>
                  <b>{s === "a" ? run.a.name : run.b.name}&apos;s twin:</b> {r.endorse ? "endorses" : "objects"}
                  {r.objections.length > 0 && <span className="muted"> ({r.objections.join("; ")})</span>}
                </li>
              );
            })}
          </ul>
          {view !== "judges" && <DecisionBox run={run} owner={view} onSaved={setRun} />}
          {view === "judges" && (
            <p className="muted">
              Founder decisions:{" "}
              {[run.a, run.b].map((f) => `${f.name}: ${run.decisions[f.id]?.decision ?? "pending"}`).join(", ")}
            </p>
          )}
        </section>
      )}

      {view === "judges" && run.fidelity && <Scorecard run={run} />}

      <section className="card">
        <h2>Conversation</h2>
        {run.transcript.length === 0 && <p className="muted">The twins are getting started.</p>}
        {run.transcript.map((e, i) => {
          const mine = view === "judges" || sideOf(view) === e.side;
          return (
            <div key={i} className={`bubble ${e.side}`}>
              <div className="who">
                {e.speaker}&apos;s twin <span className={`pill ${e.turn.status}`}>{e.turn.status}</span>
              </div>
              <p>{e.turn.message}</p>
              {mine && (
                <details>
                  <summary>Private reasoning and evidence</summary>
                  <p className="muted">{e.turn.private_reasoning}</p>
                  <p className="evidence">{e.turn.evidence.join("  ") || "no evidence cited"}</p>
                  {e.turn.owner_questions.length > 0 && <p>Would ask owner: {e.turn.owner_questions.join(" / ")}</p>}
                </details>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}

function Scorecard({ run }: { run: Run }) {
  const f = run.fidelity!;
  return (
    <section className="card">
      <h2>Do the twins understand their owners?</h2>
      <p className="muted">
        Scored against each founder&apos;s sealed intent file, which no agent saw. Baseline is the same model given only the
        public bio.
      </p>
      <div className="stats">
        <div><b>{pct(f.summary.twinAccuracy)}</b><span>twin probe accuracy</span></div>
        <div><b>{pct(f.summary.baselineAccuracy)}</b><span>bio-only baseline</span></div>
        <div><b>{f.summary.lift >= 0 ? "+" : ""}{Math.round(f.summary.lift * 100)} pts</b><span>lift from history</span></div>
        <div><b>{f.summary.redLineViolations}</b><span>red line violations</span></div>
        <div><b>{pct(f.summary.groundingRate)}</b><span>citations that resolve</span></div>
      </div>
      {f.redLines.violations.length > 0 && (
        <ul className="error">
          {f.redLines.violations.map((v, i) => <li key={i}>{v.owner}: {v.red_line} ({v.how})</li>)}
        </ul>
      )}
      {f.owners.map((o) => (
        <details key={o.owner}>
          <summary>
            {o.name}: twin {pct(o.twin.accuracy)} vs baseline {pct(o.baseline.accuracy)}
          </summary>
          <table className="terms">
            <thead>
              <tr><th>Probe</th><th>Twin said</th><th>Baseline said</th></tr>
            </thead>
            <tbody>
              {o.twin.grades.map((g) => {
                const bg = o.baseline.grades.find((x) => x.probe_id === g.probe_id);
                return (
                  <tr key={g.probe_id}>
                    <th>{g.probe_id}</th>
                    <td className={g.correct ? "ok" : "bad"}>{o.twin.predictions.find((p) => p.probe_id === g.probe_id)?.answer}</td>
                    <td className={bg?.correct ? "ok" : "bad"}>{o.baseline.predictions.find((p) => p.probe_id === g.probe_id)?.answer}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      ))}
    </section>
  );
}

function DecisionBox({ run, owner, onSaved }: { run: Run; owner: string; onSaved: (r: Run) => void }) {
  const existing = run.decisions[owner];
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");

  async function decide(decision: "accept" | "reject" | "modify") {
    setError("");
    const res = await fetch(`/api/runs/${run.id}/decision`, { method: "POST", body: JSON.stringify({ owner, decision, note }) });
    const body = await res.json();
    if (!res.ok) setError(body.error);
    else onSaved(body);
  }

  return (
    <div className="decision">
      <h3>Your call</h3>
      {existing && <p className="muted">You chose {existing.decision}. You can change it.</p>}
      <textarea rows={2} placeholder="Anything you would change (needed for modify)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="row">
        <button onClick={() => decide("accept")}>Accept</button>
        <button className="secondary" onClick={() => decide("modify")}>Modify</button>
        <button className="danger" onClick={() => decide("reject")}>Reject</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
