"use client";

import { use, useEffect, useRef } from "react";
import type { RunView } from "../../../../lib/runs";
import { useRun } from "../../../../lib/client";

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// iMessage-style view of a run: one phone per twin, the same conversation seen from each side.
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { run, error } = useRun(id);

  if (error)
    return (
      <section className="card">
        <p className="error">{error === "Not found" ? "This run does not exist, or it is not one of yours." : error}</p>
        <a className="button-link" href="/">Back to your matches</a>
      </section>
    );
  if (!run) return <p className="muted">Loading...</p>;

  return (
    <div className="chat-page">
      <p className="muted chat-goal">{run.goal}</p>
      <div className="phones">
        <Phone run={run} side="a" />
        <Phone run={run} side="b" />
      </div>
      <p className="chat-links">
        <a href={`/runs/${run.id}`}>Full run, scorecard and decision</a>
      </p>
    </div>
  );
}

function Phone({ run, side }: { run: RunView; side: "a" | "b" }) {
  const me = side === "a" ? run.a : run.b;
  const other = side === "a" ? run.b : run.a;
  const end = useRef<HTMLDivElement>(null);
  const nextSide = run.transcript.length % 2 === 0 ? "a" : "b";
  const typing = run.stage === "negotiating" && nextSide !== side;
  const thinking = run.stage === "negotiating" && nextSide === side;

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [run.transcript.length, run.stage]);

  return (
    <section className="phone" aria-label={`${me.name}'s twin`}>
      <header className="phone-head">
        <span className="avatar">{initials(other.name)}</span>
        <b>{other.name}&apos;s twin</b>
        <span className="phone-sub">seen by {me.name}&apos;s twin</span>
      </header>
      <div className="thread">
        {run.stage === "researching" && <p className="sys">Researching {other.name} on the web...</p>}
        {run.dossiers && (
          <p className="sys">
            Read {run.dossiers[side === "a" ? "b" : "a"].facts.length} public facts about {other.name} before the chat
          </p>
        )}
        {run.transcript.map((e, i) => {
          const mine = e.side === side;
          const prev = run.transcript[i - 1];
          return (
            <div key={i} className={`msg ${mine ? "out" : "in"} ${prev?.side === e.side ? "cont" : ""}`}>
              {e.turn.message
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, j) => (
                  <div key={j} className="bubble-i">
                    {line}
                  </div>
                ))}
              {mine && e.turn.private_reasoning && (
                <details className="why">
                  <summary>why</summary>
                  <p>{e.turn.private_reasoning}</p>
                  {e.turn.evidence.length > 0 && <p className="ev">{e.turn.evidence.join("  ")}</p>}
                </details>
              )}
              {mine && e.turn.status !== "continue" && <span className="receipt">{e.turn.status === "ready" ? "Ready to propose" : "Walked away"}</span>}
            </div>
          );
        })}
        {typing && (
          <div className="msg in">
            <div className="bubble-i typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {thinking && <p className="sys">Thinking with {me.name}&apos;s history...</p>}
        {(run.stage === "mediating" || run.stage === "ratifying" || run.stage === "scoring") && (
          <p className="sys">{run.stage === "mediating" ? "Mediator is writing the proposal..." : run.stage === "ratifying" ? "Checking the proposal against " + me.name + "..." : "Scoring..."}</p>
        )}
        {run.outcome && run.stage === "done" && (
          <div className="outcome-card">
            <span className={`pill verdict ${run.outcome.verdict}`}>{run.outcome.verdict.replace("_", " ")}</span>
            <p>{run.outcome.headline}</p>
            {run.outcome.decision?.needed && run.outcome.decision.ask && <p className="phone-sub">Proposed next step: {run.outcome.decision.ask}</p>}
            {run.ratifications?.[side] && <p className="phone-sub">{me.name}&apos;s twin {run.ratifications[side].endorse ? "endorses it" : "objects"}</p>}
          </div>
        )}
        {run.error && <p className="sys error">{run.error}</p>}
        <div ref={end} />
      </div>
      <footer className="phone-foot">
        <span>iMessage</span>
      </footer>
    </section>
  );
}
