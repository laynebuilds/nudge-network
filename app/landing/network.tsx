"use client";

import { useEffect, useState } from "react";

// Hero visual: your twin in the middle, talking to the twins around it one at a time.
// Each conversation ends in a match (brought back to you) or a pass (you never hear about it).
type Node = { name: string; x: number; y: number; tone: string };
type Talk = { to: number; line: string; match: boolean; tag?: string };

const NODES: Node[] = [
  { name: "Lina", x: 14, y: 30, tone: "t1" },
  { name: "Omar", x: 27, y: 74, tone: "t2" },
  { name: "Sam", x: 33, y: 16, tone: "t3" },
  { name: "Kai", x: 68, y: 14, tone: "t4" },
  { name: "Jess", x: 86, y: 34, tone: "t5" },
  { name: "Marcus", x: 74, y: 78, tone: "t6" },
  { name: "Theo", x: 9, y: 62, tone: "t3" },
  { name: "Maya", x: 91, y: 66, tone: "t1" },
];
const YOU = { x: 50, y: 48 };

const TALKS: Talk[] = [
  { to: 2, line: "loves natural wine, hates loud bars", match: true, tag: "Date" },
  { to: 1, line: "moving to Lisbon next month", match: false },
  { to: 3, line: "designer, wants equity, same time zone", match: true, tag: "Hire" },
  { to: 4, line: "only invests in crypto", match: false },
  { to: 0, line: "also runs at 6am, lives 4 blocks away", match: true, tag: "Friend" },
  { to: 6, line: "wants to be CEO too", match: false },
  { to: 7, line: "needs a seller, you need a builder", match: true, tag: "Cofounder" },
  { to: 5, line: "writes $50k checks in climate", match: true, tag: "Investor" },
];

// Background chatter between other twins, so the network feels alive.
const CHATTER: [number, number][] = [[0, 2], [3, 4], [5, 7], [1, 6], [2, 3], [4, 7], [0, 6], [1, 5]];

export default function Network() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"talk" | "verdict">("talk");

  useEffect(() => {
    const t = setTimeout(
      () => {
        if (phase === "talk") setPhase("verdict");
        else {
          setPhase("talk");
          setStep((s) => s + 1);
        }
      },
      phase === "talk" ? 1500 : 1100
    );
    return () => clearTimeout(t);
  }, [phase, step]);

  const talk = TALKS[step % TALKS.length];
  const node = NODES[talk.to];
  const round = Math.floor(step / TALKS.length);
  // Matches found so far in this loop, including the current one once its verdict shows.
  const done = TALKS.slice(0, step % TALKS.length).filter((t) => t.match);
  const found = phase === "verdict" && talk.match ? [...done, talk] : done;
  const chat = CHATTER[step % CHATTER.length];
  const mid = { x: (YOU.x + node.x) / 2, y: (YOU.y + node.y) / 2 };

  return (
    <div className="net" aria-label="Your twin talking to other twins on Jebln">
      <svg className="net-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {NODES.map((n, i) => (
          <line key={i} x1={YOU.x} y1={YOU.y} x2={n.x} y2={n.y} className="ln" />
        ))}
        <line x1={NODES[chat[0]].x} y1={NODES[chat[0]].y} x2={NODES[chat[1]].x} y2={NODES[chat[1]].y} className="ln chatter" key={`c${step}`} />
        <line
          key={`a${step}`}
          x1={YOU.x}
          y1={YOU.y}
          x2={node.x}
          y2={node.y}
          className={`ln active ${phase === "verdict" ? (talk.match ? "yes" : "no") : ""}`}
        />
      </svg>

      {NODES.map((n, i) => {
        const matched = found.some((f) => f.to === i);
        const on = i === talk.to;
        return (
          <div
            key={n.name}
            className={`nd ${on ? "on" : ""} ${matched ? "matched" : ""} ${on && phase === "verdict" && !talk.match ? "passed" : ""}`}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span className={`face ${n.tone}`}>{n.name[0]}</span>
            <small>{n.name}&apos;s twin</small>
          </div>
        );
      })}

      <div className="nd you" style={{ left: `${YOU.x}%`, top: `${YOU.y}%` }}>
        <span className="face me">You</span>
        <small>Your twin</small>
      </div>

      <div key={`b${step}-${round}`} className="net-bubble" style={{ left: `${mid.x}%`, top: `${mid.y}%` }}>
        <span className="nb-line">{talk.line}</span>
        {phase === "verdict" && (
          <span className={`nb-verdict ${talk.match ? "yes" : "no"}`}>{talk.match ? `${talk.tag} match` : "Pass"}</span>
        )}
      </div>

      <div className="net-count">
        <b>{found.length}</b>
        <span>brought back to you</span>
        <div className="tags">
          {found.map((f) => (
            <i key={f.tag}>{f.tag}</i>
          ))}
        </div>
      </div>
    </div>
  );
}
