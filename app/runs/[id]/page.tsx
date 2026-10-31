"use client";

import { use, useState } from "react";
import type { RunView } from "../../../lib/runs";
import { api, useRun } from "../../../lib/client";

const STAGES = ["researching", "negotiating", "mediating", "ratifying", "scoring", "done"];
const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // The server drives the run on its own. This page only watches, and nudges a run that has stalled.
  const { run, setRun, error } = useRun(id, 4000);

  if (error)
    return (
      <section className="card">
        <p className="error">{error === "Not found" ? "This run does not exist, or it is not one of yours." : error}</p>
        <a className="button-link" href="/">Back to your matches</a>
      </section>
    );
  if (!run) return <p className="muted">Loading...</p>;
  const name = (s: "a" | "b") => (s === "a" ? run.a.name : run.b.name);
  const o = run.outcome;
  // Without auth (local demo) there is no signed-in founder, so both decision boxes show. A signed-in
  // onlooker (an admin watching someone else's run) cannot decide, so they get none.
  const deciders = run.party ? [run.party === "a" ? run.a : run.b] : run.viewer ? [] : [run.a, run.b];

  return (
    <>
      <section className="card">
        <h1>
          {run.a.name} x {run.b.name}
        </h1>
        <p className="muted">{run.goal}</p>
        <p><a href={`/runs/${run.id}/chat`}>Watch it as iMessage</a></p>
        <div className="stages">
          {STAGES.map((s) => (
            <span key={s} className={`pill ${run.stage === s ? "on" : STAGES.indexOf(s) < STAGES.indexOf(run.stage) ? "past" : ""}`}>
              {s}
            </span>
          ))}
          {run.revised && <span className="pill">revised once after objections</span>}
        </div>
        {run.error && <p className="error">{run.error}</p>}
        {!run.full && run.party && (
          <p className="muted">
            You see your own twin&apos;s reasoning and scorecard. Everything else opens up once you have both decided.
          </p>
        )}
      </section>

      {o && run.stage !== "mediating" && (
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
            {(["a", "b"] as const).map((s) => (
              <div key={s}>
                <h3>{name(s)} gains</h3>
                <ul>{o.gains[s].map((g) => <li key={g}>{g}</li>)}</ul>
              </div>
            ))}
          </div>
          <h3>Constraints the twins held</h3>
          <ul>
            {o.constraints_respected.map((c, i) => (
              <li key={i}>
                <b>{name(c.owner)}:</b> {c.constraint} <span className="muted">({c.how})</span>
              </li>
            ))}
          </ul>
          <h3>Needs a human</h3>
          <ul>
            {o.unresolved.map((u, i) => (
              <li key={i}>
                {u.for_owner !== "both" && <b>{name(u.for_owner)}: </b>}
                {u.question} <span className="muted">({u.why})</span>
              </li>
            ))}
          </ul>
          {run.ratifications && (
            <>
              <h3>Twin check</h3>
              <ul>
                {(["a", "b"] as const)
                  .filter((s) => run.ratifications?.[s])
                  .map((s) => {
                    const r = run.ratifications![s];
                    return (
                      <li key={s}>
                        <b>{name(s)}&apos;s twin:</b> {r.endorse ? "endorses" : "objects"}
                        {r.objections.length > 0 && <span className="muted"> ({r.objections.join("; ")})</span>}
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
          {run.stage === "done" &&
            deciders.map((f) => <DecisionBox key={f.id} runId={run.id} owner={f} existing={run.decisions[f.id]} onSaved={setRun} />)}
          <p className="muted">
            Decisions: {[run.a, run.b].map((f) => `${f.name} ${run.decisions[f.id]?.decision ?? "pending"}`).join(", ")}
          </p>
        </section>
      )}

      {run.fidelity && <Scorecard run={run} />}

      {run.dossiers && (
        <section className="card">
          <h2>What each twin found out first</h2>
          <p className="muted">Before talking, each twin researched the other person on the web, including where the two of you overlap.</p>
          {(["a", "b"] as const).map((s) => (
            <details key={s}>
              <summary>On {name(s)}: {run.dossiers![s].facts.length} public facts</summary>
              <ul>
                {run.dossiers![s].facts.map((f, i) => (
                  <li key={i}>
                    {"category" in f && f.category ? <span className="pill">{f.category}</span> : null} {f.fact} <a href={f.url} target="_blank" rel="noreferrer">source</a>
                  </li>
                ))}
              </ul>
              {run.dossiers![s].doubts.length > 0 && <p className="muted">Doubts: {run.dossiers![s].doubts.join("; ")}</p>}
            </details>
          ))}
        </section>
      )}

      <section className="card">
        <h2>Conversation</h2>
        {run.transcript.length === 0 && <p className="muted">The twins are getting started. You can close this page; they keep going without you.</p>}
        {run.transcript.map((e, i) => (
          <div key={i} className={`bubble ${e.side}`}>
            <div className="who">
              {e.speaker}&apos;s twin <span className={`pill ${e.turn.status}`}>{e.turn.status}</span>
            </div>
            <p>{e.turn.message}</p>
            {e.turn.private_reasoning && (
              <details>
                <summary>Private reasoning and evidence</summary>
                <p className="muted">{e.turn.private_reasoning}</p>
                <p className="evidence">{e.turn.evidence.join("  ") || "no evidence cited"}</p>
                {e.turn.owner_questions.length > 0 && <p>Would ask owner: {e.turn.owner_questions.join(" / ")}</p>}
              </details>
            )}
          </div>
        ))}
        {run.stage === "negotiating" && <p className="muted">Next twin is thinking...</p>}
      </section>
    </>
  );
}

function Scorecard({ run }: { run: RunView }) {
  const f = run.fidelity!;
  return (
    <section className="card">
      <h2>Do the twins understand their owners?</h2>
      <p className="muted">
        Scored against each founder&apos;s sealed intent, which no agent saw. Baseline is the same model given only the public bio.
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
      <p className="muted">{f.redLines.notes}</p>
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

function DecisionBox({
  runId,
  owner,
  existing,
  onSaved,
}: {
  runId: string;
  owner: { id: string; name: string };
  existing?: { decision: string; note: string };
  onSaved: (r: RunView) => void;
}) {
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function decide(decision: "accept" | "reject" | "modify") {
    if (decision === "modify" && !note.trim()) return setError("Say what you would change first.");
    setError("");
    setBusy(decision);
    const res = await api<RunView>(`/api/runs/${runId}/decision`, { method: "POST", body: { owner: owner.id, decision, note } });
    setBusy("");
    if (!res.ok) setError(res.error);
    else onSaved(res.body);
  }

  return (
    <div className="decision">
      <h3>{owner.name}&apos;s call</h3>
      {existing && <p className="muted">Chose {existing.decision}. You can change it.</p>}
      <textarea rows={2} placeholder="Anything you would change (needed for modify)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="row">
        <button onClick={() => decide("accept")} disabled={!!busy}>{busy === "accept" ? "Saving..." : "Accept"}</button>
        <button className="secondary" onClick={() => decide("modify")} disabled={!!busy}>{busy === "modify" ? "Saving..." : "Modify"}</button>
        <button className="danger" onClick={() => decide("reject")} disabled={!!busy}>{busy === "reject" ? "Saving..." : "Reject"}</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
