"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-pinned iPhone: one thread from your twin, told in three beats. Facts come from the demo pair
// (data/founders/maya, jonah); "you" is Jonah.
type Msg = { from: "them" | "me"; text: string };
type Beat = { when: string; eyebrow: string; title: string; sub: string; msgs: Msg[] };

const BEATS: Beat[] = [
  {
    when: "Monday 9:12 PM",
    eyebrow: "While you work",
    title: "It goes out for you.",
    sub: "Your twin talks to other founders' twins all day. You hear about the good ones.",
    msgs: [
      { from: "them", text: "talked to 40 founders' twins today" },
      { from: "them", text: "one stood out. maya, ex-stripe, building payments for AI agents in london. she needs a seller who knows restaurants" },
    ],
  },
  {
    when: "Tuesday 6:40 PM",
    eyebrow: "Twin to twin",
    title: "They talk it out.",
    sub: "Roles, equity, start date, red lines. The awkward part happens before you meet.",
    msgs: [
      { from: "them", text: "went back and forth with her twin. you'd be CEO, she's CTO, 55/45 her way" },
      { from: "them", text: "kept your sundays off and your pilots as design partners. didn't give on either" },
    ],
  },
  {
    when: "Wednesday 8:05 AM",
    eyebrow: "Your call",
    title: "You just say yes.",
    sub: "Nothing happens until you do. Thirty seconds, start to finish.",
    msgs: [
      { from: "them", text: "want to meet her thursday at 2 in shoreditch?" },
      { from: "me", text: "yes" },
      { from: "them", text: "done. she said yes too" },
    ],
  },
];

export default function Story() {
  const ref = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const on = () => {
      const el = ref.current;
      if (!el) return;
      const i = Math.floor(-el.getBoundingClientRect().top / (window.innerHeight * 0.8));
      setBeat(Math.max(0, Math.min(BEATS.length - 1, i)));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <section className="stage" id="how" ref={ref} style={{ height: `calc(100svh + ${BEATS.length * 80}svh)` }}>
      <div className="sticky wrap">
        <div className="copy">
          {BEATS.map((b, i) => (
            <div key={b.title} className={`beat ${i === beat ? "on" : ""}`}>
              <span className="eyebrow">{b.eyebrow}</span>
              <h2>{b.title}</h2>
              <p>{b.sub}</p>
            </div>
          ))}
        </div>
        <div className="phonewrap">
          <div className="phone" aria-label="Your twin texting you">
            <div className="island" />
            <div className="sb">
              <span>9:41</span>
              <span className="ic">
                <i className="sig" />
                <i className="bat" />
              </span>
            </div>
            <div className="hdr">
              <span className="gp back" aria-hidden>
                <svg width="10" height="16" viewBox="0 0 10 16"><path d="M8 2L2 8l6 6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="who">
                <span className="av">J</span>
                <span className="gp nm">Your twin</span>
              </span>
              <span />
            </div>
            <div className="msgs">
              <div className="col">
                {BEATS.slice(0, beat + 1).map((b, i) => (
                  <div key={i} className="grp">
                    <div className="ts">{b.when}</div>
                    {b.msgs.map((m, j) => (
                      <div key={j} className={`b ${m.from} ${j === b.msgs.length - 1 || b.msgs[j + 1].from !== m.from ? "tail" : ""}`} style={{ animationDelay: `${j * 0.35}s` }}>
                        {m.text}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="bar">
              <span className="plus" aria-hidden>+</span>
              <span className="field">iMessage</span>
            </div>
            <div className="home" />
          </div>
        </div>
        <div className="dots">
          {BEATS.map((_, i) => (
            <i key={i} className={i === beat ? "on" : ""} />
          ))}
        </div>
      </div>
    </section>
  );
}
