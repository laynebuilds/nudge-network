"use client";

import { useEffect, useRef, useState } from "react";

// "Your twin's inbox": your twin (Jonah's, from the demo pair) running several twin-to-twin threads at once.
// Lines play out over time, so live threads keep moving while you watch.
type Line =
  | { kind: "them" | "you"; text: string }
  | { kind: "act"; text: string }
  | { kind: "result"; title: string; terms: string[] };
type Thread = {
  id: string;
  name: string;
  tag: string;
  time: string;
  status: "needs" | "live" | "booked" | "passed";
  lines: Line[];
};

const THREADS: Thread[] = [
  {
    id: "maya",
    name: "Maya",
    time: "now",
    tag: "Cofounder",
    status: "needs",
    lines: [
      { kind: "them", text: "maya needs a commercial cofounder, full time by mid january. is jonah?" },
      { kind: "act", text: "Read texts about notice period" },
      { kind: "you", text: "his cliff at his job is 14 feb, but he'd leave early for the right thing" },
      { kind: "them", text: "she won't build on crypto rails. dealbreaker?" },
      { kind: "you", text: "no. he was curious about stablecoins, not committed. fiat works" },
      { kind: "them", text: "she'd rather build than run the board. CEO is his if he wants it" },
      { kind: "act", text: "Kept Sundays off" },
      { kind: "act", text: "Checked calendar, Thursday 2pm is free" },
      { kind: "result", title: "Proposal", terms: ["Roles|Jonah CEO, Maya CTO", "Equity|55 / 45", "Start|15 January", "Meet|Thursday 2pm, Shoreditch"] },
    ],
  },
  {
    id: "ifeoma",
    name: "Ifeoma",
    time: "2m",
    tag: "Angel",
    status: "live",
    lines: [
      { kind: "you", text: "jonah's closing a technical cofounder this week. ifeoma mentioned a check" },
      { kind: "them", text: "she'll write $25k the day that cofounder is full time" },
      { kind: "act", text: "Linked to the Maya thread" },
      { kind: "you", text: "if thursday goes well that's mid january. can we hold a call for the 16th?" },
      { kind: "them", text: "holding it. she'll want to meet the cofounder too" },
    ],
  },
  {
    id: "kai",
    name: "Kai",
    time: "1h",
    tag: "First hire",
    status: "booked",
    lines: [
      { kind: "them", text: "kai's a product engineer, shipped payments at two startups. wants equity over salary" },
      { kind: "act", text: "Checked calendar, evenings only" },
      { kind: "you", text: "jonah's still at his day job. tuesday 6:30pm work?" },
      { kind: "them", text: "booked" },
    ],
  },
  {
    id: "theo",
    name: "Theo",
    time: "3h",
    tag: "Cofounder",
    status: "passed",
    lines: [
      { kind: "them", text: "theo wants to be CEO and move to SF in the spring" },
      { kind: "act", text: "Read notes on role and location" },
      { kind: "you", text: "two CEOs in two cities. not a fit, but thanks" },
    ],
  },
  {
    id: "sasha",
    name: "Sasha",
    time: "6m",
    tag: "Advisor",
    status: "live",
    lines: [
      { kind: "them", text: "sasha scaled SMB sales at a fintech from 2 reps to 40" },
      { kind: "you", text: "jonah sells to restaurants. would she do a monthly call?" },
      { kind: "them", text: "yes, if he sends numbers before each one" },
    ],
  },
];

const STATUS = { needs: "Needs you", live: "Talking", booked: "Booked", passed: "Passed" } as const;

export default function Inbox() {
  const [sel, setSel] = useState(0);
  const [auto, setAuto] = useState(true);
  const [tick, setTick] = useState(0);
  const [decided, setDecided] = useState<string | null>(null);

  // Every thread reveals one more line per tick, staggered so they don't move in lockstep.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1400);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setSel((x) => (x + 1) % THREADS.length), 7000);
    return () => clearInterval(t);
  }, [auto]);

  const shownCount = (i: number) => {
    const th = THREADS[i];
    const live = th.status === "live";
    // Settled threads start mostly written; live ones loop so they never look finished.
    const start = live ? 0 : th.lines.length - 2;
    const n = start + Math.max(0, tick - i);
    return live ? (n % (th.lines.length + 2)) : Math.min(th.lines.length, n);
  };

  const th = THREADS[sel];
  const n = shownCount(sel);
  const body = useRef<HTMLDivElement>(null);
  // Keep the newest line in view, like a real chat.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = body.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [n, sel, decided]);
  const typing = n < th.lines.length && th.lines[n].kind !== "act" && th.lines[n].kind !== "result" ? th.lines[n].kind : null;

  return (
    <div className="inbox">
      <aside className="ib-list">
        {THREADS.map((t, i) => {
          const k = shownCount(i);
          const last = [...t.lines.slice(0, k)].reverse().find((l) => l.kind === "them" || l.kind === "you") as
            | { kind: "them" | "you"; text: string }
            | undefined;
          const isTyping = t.status === "live" && k < t.lines.length && t.lines[k].kind !== "act";
          return (
            <button
              key={t.id}
              className={`ib-item ${i === sel ? "on" : ""} ${t.status}`}
              onClick={() => {
                setAuto(false);
                setSel(i);
              }}
            >
              <span className="ib-row">
                <i className={`st ${t.status}`} />
                <b>{t.name}</b>
                <span className="ib-tag">{t.tag}</span>
                <span className="ib-time">{t.time}</span>
              </span>
              <span className="ib-snip">{isTyping ? "typing..." : last ? (last.kind === "you" ? "You: " : "") + last.text : ""}</span>
            </button>
          );
        })}
      </aside>

      <section className="ib-pane" key={th.id}>
        <div className="ib-head">
          <b>{th.name}&apos;s twin</b>
          <span className="ib-tag">{th.tag}</span>
          <span className={`ib-state ${th.status}`}>{STATUS[th.status]}</span>
        </div>
        <div className="ib-body" ref={body}>
          {th.lines.slice(0, n).map((l, i) =>
            l.kind === "act" ? (
              <div key={i} className="ib-act">
                {l.text}
              </div>
            ) : l.kind === "result" ? (
              <div key={i} className="ib-result">
                <div className="ib-r-title">{l.title}</div>
                <dl>
                  {l.terms.map((x) => {
                    const [k, v] = x.split("|");
                    return (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    );
                  })}
                </dl>
                {decided ? (
                  <p className="r-done">{decided}</p>
                ) : (
                  <div className="r-btns">
                    <button onClick={() => setDecided("Accepted. Maya's twin is telling her now.")}>Accept</button>
                    <button className="secondary" onClick={() => setDecided("Sent back to your twin with changes.")}>Modify</button>
                    <button className="text" onClick={() => setDecided("Passed. Maya won't hear a thing.")}>Pass</button>
                  </div>
                )}
              </div>
            ) : (
              <div key={i} className={`ib-msg ${l.kind}`}>
                {l.text}
              </div>
            )
          )}
          {typing && (
            <div className={`ib-msg ${typing} typing`}>
              <i />
              <i />
              <i />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
