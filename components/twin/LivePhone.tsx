"use client";

import { useEffect, useRef, useState } from "react";
import type { RunView } from "../../lib/runs";
import { useRun } from "../../lib/client";
import "./twin.css";

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// One twin's phone, playing a run live as iMessage. Polls the run itself, so it can sit anywhere: the chat
// page, a match card that just started a conversation, or the end of onboarding. side defaults to the
// viewer's own twin.
export default function LivePhone({ runId, side }: { runId: string; side?: "a" | "b" }) {
  const { run, error } = useRun(runId);
  if (error) return <p className="error">{error === "Not found" ? "This conversation does not exist, or it is not one of yours." : error}</p>;
  if (!run)
    return (
      <p className="muted twin-pulse">
        Opening the conversation<span className="dots" aria-hidden><i /><i /><i /></span>
      </p>
    );
  const s = side ?? ((run.party ?? "a") as "a" | "b");
  return (
    <div className="twin-live">
      <Phone key={s} run={run} side={s} />
    </div>
  );
}

// The phone itself, for pages that already hold the run (the chat page polls once and switches sides).
export function Phone({ run, side, hiddenOnPhone = false }: { run: RunView; side: "a" | "b"; hiddenOnPhone?: boolean }) {
  const me = side === "a" ? run.a : run.b;
  const other = side === "a" ? run.b : run.a;
  const end = useRef<HTMLDivElement>(null);
  const nextSide = run.transcript.length % 2 === 0 ? "a" : "b";
  const typing = run.stage === "negotiating" && nextSide !== side;
  const thinking = run.stage === "negotiating" && nextSide === side;

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [run.transcript.length, run.stage]);

  // A new message shows "Delivered" for a moment, then "Read" once the other twin is on it.
  const [fresh, setFresh] = useState(false);
  const seen = useRef(run.transcript.length);
  useEffect(() => {
    if (run.transcript.length === seen.current) return;
    seen.current = run.transcript.length;
    setFresh(true);
    const t = setTimeout(() => setFresh(false), 2500);
    return () => clearTimeout(t);
  }, [run.transcript.length]);

  // While researching nothing has been said yet, so show what the twin is doing step by step.
  const RESEARCH = [`Searching the web for ${other.name}`, "Reading their public profiles", `Looking for what ${other.name.split(" ")[0]} and ${me.name.split(" ")[0]} have in common`];
  const [researchStep, setResearchStep] = useState(0);
  useEffect(() => {
    if (run.stage !== "researching") return;
    const t = setInterval(() => setResearchStep((n) => Math.min(n + 1, RESEARCH.length - 1)), 9000);
    return () => clearInterval(t);
  }, [run.stage, RESEARCH.length]);
  const dossier = run.dossiers?.[side === "a" ? "b" : "a"];
  const lastIndex = run.transcript.length - 1;

  return (
    <section className={`phone${hiddenOnPhone ? " off-phone" : ""}`} aria-label={`${me.name}'s twin`}>
      <header className="phone-head">
        <span className="avatar">{initials(other.name)}</span>
        <b>{other.name.split(" ")[0]}&apos;s twin</b>
        <span className="phone-sub">on {me.name.split(" ")[0]}&apos;s twin&apos;s phone</span>
      </header>
      <div className="thread">
        {run.stage === "researching" && (
          <div className="research">
            {RESEARCH.slice(0, researchStep + 1).map((line, i) => (
              <p key={line} className={`sys step${i === researchStep ? " live" : ""}`}>
                {line}
                {i === researchStep && <span className="dots" aria-hidden><i /><i /><i /></span>}
              </p>
            ))}
          </div>
        )}
        {dossier && dossier.facts.length > 0 && (
          <div className="found">
            <p className="found-title">Before the chat: {dossier.facts.length} things found about {other.name.split(" ")[0]}</p>
            {dossier.facts.slice(0, 3).map((f, i) => (
              <p key={i} className="found-fact">{f.fact}</p>
            ))}
          </div>
        )}
        {run.transcript.map((e, i) => {
          const mine = e.side === side;
          const prev = run.transcript[i - 1];
          return (
            <div key={i} className={`msg ${mine ? "out" : "in"} ${prev?.side === e.side ? "cont" : ""}`}>
              {prev?.side !== e.side && <span className="sender">{mine ? `${me.name.split(" ")[0]}'s twin` : `${other.name.split(" ")[0]}'s twin`}</span>}
              {e.turn.message
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, j) => (
                  <div key={j} className="bubble-i pop" style={{ animationDelay: `${j * 0.7}s` }}>
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
              {mine && i === lastIndex && <span className="receipt">{fresh && run.stage === "negotiating" ? "Delivered" : "Read"}</span>}
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
        {thinking ? (
          <span className="composing">
            {me.name.split(" ")[0]}&apos;s twin is writing<span className="dots" aria-hidden><i /><i /><i /></span>
          </span>
        ) : (
          <span>iMessage</span>
        )}
      </footer>
    </section>
  );
}
