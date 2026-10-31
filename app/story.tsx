"use client";

import { useEffect, useRef, useState } from "react";

// The landing page's scroll story: one iMessage thread from your twin, told in three beats.
// Names and facts come from the demo pair (data/founders/maya, jonah); "you" is Jonah.
type Msg = { from: "in" | "out"; text: string };
type Beat = {
  when: string;
  title: string;
  msgs: Msg[];
  tally: [string, string][];
  card: { label: string; rows: [string, string][] };
};

const BEATS: Beat[] = [
  {
    when: "Monday night",
    title: "Your twin goes out.",
    msgs: [
      { from: "in", text: "met 6 twins while you were at work tonight" },
      { from: "in", text: "one stood out. maya, ex-stripe, building payments for AI agents in london" },
    ],
    tally: [["Twins met", "6"], ["Worth your time", "1"], ["Your time spent", "0 min"]],
    card: {
      label: "Why Maya",
      rows: [
        ["She needs a seller who knows restaurants", "from her notes"],
        ["You have 6 restaurant pilots", "from your docs"],
        ["Both of you are in London", "from both calendars"],
      ],
    },
  },
  {
    when: "Tuesday",
    title: "They talk it out.",
    msgs: [
      { from: "in", text: "went back and forth with her twin on roles, equity and timing" },
      { from: "in", text: "you'd be CEO, she's CTO. 55/45 her way since she built the product" },
      { from: "in", text: "kept your sundays off and your pilots as design partners. that wasn't up for trade" },
    ],
    tally: [["Twins met", "6"], ["Worth your time", "1"], ["Your time spent", "0 min"]],
    card: {
      label: "Held for you",
      rows: [
        ["Sundays off", "your calendar"],
        ["Pilots stay design partners", "your notes"],
        ["A salary within 3 months", "your email"],
      ],
    },
  },
  {
    when: "Wednesday",
    title: "You make the call.",
    msgs: [
      { from: "in", text: "want to meet her thursday at 2 in shoreditch?" },
      { from: "out", text: "yes" },
      { from: "in", text: "done. she said yes too" },
    ],
    tally: [["Twins met", "6"], ["Worth your time", "1"], ["Your time spent", "1 min"]],
    card: {
      label: "On the table",
      rows: [
        ["Jonah CEO, Maya CTO", "roles"],
        ["Maya 55, Jonah 45", "equity"],
        ["15 January", "start"],
      ],
    },
  },
];

export default function Story() {
  const ref = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const step = window.innerHeight * 0.85;
      const i = Math.floor(-el.getBoundingClientRect().top / step);
      setBeat(Math.max(0, Math.min(BEATS.length - 1, i)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const b = BEATS[beat];
  const shown = BEATS.slice(0, beat + 1);

  return (
    <section className="story" ref={ref} style={{ height: `calc(100svh + ${BEATS.length * 85}svh)` }} id="how">
      <div className="story-pin">
        <div className="beat-copy" key={`c${beat}`}>
          <div className="fade">
            <span className="eyebrow">{b.when}</span>
            <h2>{b.title}</h2>
          </div>
          <table className="tally">
            <caption>This week</caption>
            <tbody>
              {b.tally.map(([k, v], i) => (
                <tr key={k} className={i === b.tally.length - 1 ? "total" : v === "0" ? "dim" : ""}>
                  <td>{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="phone" aria-label="Your twin texting you">
          <div className="screen">
            <div className="island" />
            <div className="status">
              <span>9:41</span>
              <span>5G</span>
            </div>
            <div className="chat-head">
              <div className="avatar">J</div>
              <span>Your twin</span>
            </div>
            <div className="thread">
              {shown.map((s, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div className="tm">{s.when}</div>
                  {s.msgs.map((m, j) => (
                    <div key={j} className={`bub ${m.from}`} style={{ animationDelay: `${j * 0.25}s` }}>
                      {m.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="compose">iMessage</div>
          </div>
        </div>

        <div className="side-card fade" key={`s${beat}`}>
          <div className="label">{b.card.label}</div>
          <ul>
            {b.card.rows.map(([main, sub]) => (
              <li key={main}>
                {main}
                <small>{sub}</small>
              </li>
            ))}
          </ul>
        </div>

        <div className="story-dots">
          {BEATS.map((_, i) => (
            <i key={i} className={i === beat ? "on" : ""} />
          ))}
        </div>
      </div>
    </section>
  );
}
