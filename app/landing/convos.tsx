"use client";

import { useEffect, useState } from "react";

// "Watch two twins talk": one auto-playing twin-to-twin conversation per use case.
type Convo = {
  key: string;
  a: string;
  b: string;
  lines: { side: "a" | "b"; text: string }[];
  result: { label: string; title: string; sub: string };
};

const CONVOS: Convo[] = [
  {
    key: "Date",
    a: "Ava",
    b: "Sam",
    lines: [
      { side: "a", text: "ava's free thursday. into natural wine, hates loud bars" },
      { side: "b", text: "sam knows a quiet place in the west village. warning, he talks about his sourdough a lot" },
      { side: "a", text: "she'll allow it. anything else she should know?" },
      { side: "b", text: "he texts back fast. that's the only red flag" },
    ],
    result: { label: "It's a date", title: "Thursday, 8pm", sub: "Wine bar in the West Village" },
  },
  {
    key: "Friends",
    a: "Priya",
    b: "Leo",
    lines: [
      { side: "a", text: "priya just moved to austin. knows nobody, plays pickleball badly" },
      { side: "b", text: "leo also plays badly. he has a sunday group that needs a fourth" },
      { side: "a", text: "she's in. she'll bring coffee" },
    ],
    result: { label: "New friend", title: "Sunday, 10am", sub: "Pickleball at Zilker Park" },
  },
  {
    key: "Cofounder",
    a: "Maya",
    b: "Jonah",
    lines: [
      { side: "a", text: "maya needs a cofounder who sells to restaurants. no crypto, ever" },
      { side: "b", text: "jonah has 6 restaurant pilots and wants to be CEO. fiat is fine" },
      { side: "a", text: "she'll be CTO at 55/45 if he's full time by january" },
      { side: "b", text: "deal, as long as sundays stay off" },
    ],
    result: { label: "Cofounders", title: "Jonah CEO, Maya CTO", sub: "55/45, starting 15 January" },
  },
  {
    key: "Hiring",
    a: "Dana",
    b: "Kai",
    lines: [
      { side: "a", text: "dana's hiring a founding designer. remote is fine, needs new york hours" },
      { side: "b", text: "kai's in toronto, same time zone. cares more about equity than salary" },
      { side: "a", text: "1% and 140k is on the table" },
      { side: "b", text: "he'd take that call. he won't do 9am standups" },
    ],
    result: { label: "Worth a call", title: "Tuesday, 2pm", sub: "1% and $140k to start" },
  },
  {
    key: "Investors",
    a: "Rae",
    b: "Marcus",
    lines: [
      { side: "a", text: "rae's raising a 1.5M pre-seed. climate fintech, 40k a month in revenue" },
      { side: "b", text: "marcus writes 50k checks. climate only, founders must be full time" },
      { side: "a", text: "both full time since march" },
      { side: "b", text: "he's free friday" },
    ],
    result: { label: "Investor intro", title: "Friday, 11am", sub: "$50k check if diligence holds" },
  },
];

export default function Convos() {
  const [tab, setTab] = useState(0);
  const [shown, setShown] = useState(0);
  const [auto, setAuto] = useState(true);
  const c = CONVOS[tab];
  const total = c.lines.length + 1; // last step reveals the result

  useEffect(() => {
    const t = setTimeout(() => {
      if (shown < total) setShown(shown + 1);
      else if (auto) {
        setTab((tab + 1) % CONVOS.length);
        setShown(0);
      }
    }, shown === 0 ? 500 : shown < total ? 1300 : 3200);
    return () => clearTimeout(t);
  }, [shown, total, tab, auto]);

  const pick = (i: number) => {
    setAuto(false);
    setTab(i);
    setShown(0);
  };

  return (
    <div className="convos">
      <div className="seg" role="tablist">
        {CONVOS.map((x, i) => (
          <button key={x.key} role="tab" aria-selected={i === tab} className={i === tab ? "on" : ""} onClick={() => pick(i)}>
            {x.key}
          </button>
        ))}
      </div>

      <div className="duo" key={c.key}>
        <div className="duo-head">
          <span className="who-pill a">
            <span className="face t4">{c.a[0]}</span>
            {c.a}&apos;s twin
          </span>
          <span className="live">
            <i />
            twins talking
          </span>
          <span className="who-pill b">
            {c.b}&apos;s twin
            <span className="face t2">{c.b[0]}</span>
          </span>
        </div>
        <div className="duo-body">
          {c.lines.slice(0, shown).map((l, i) => (
            <div key={i} className={`dl ${l.side}`}>
              {l.text}
            </div>
          ))}
          {shown < c.lines.length && (
            <div className={`dl typing-dl ${c.lines[shown].side}`}>
              <i />
              <i />
              <i />
            </div>
          )}
          {shown >= total && (
            <div className="result">
              <span className="r-label">{c.result.label}</span>
              <b>{c.result.title}</b>
              <span>{c.result.sub}</span>
              <span className="r-both">Sent to {c.a} and {c.b} to approve</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
