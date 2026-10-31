"use client";

import { useEffect, useState } from "react";

// The rotating third line and the text from your twin change together.
const ROWS = [
  { line: "your cofounder.", text: "maya needs a seller and you need a builder. her twin and i already agree on roles. intro?" },
  { line: "your first hire.", text: "kai has shipped payments infra before and cares more about equity than salary. call tuesday?" },
  { line: "your angels.", text: "marcus writes $25k pre-seed checks into fintech. his twin says he's free friday" },
  { line: "your first users.", text: "3 restaurant groups want to pilot. their twins said yes to a 20 minute demo" },
  { line: "your advisor.", text: "she scaled sales at a fintech from 2 to 40 reps. open to monthly calls" },
];

export default function Hero() {
  const [i, setI] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const t = setTimeout(
      () => {
        if (typing) setTyping(false);
        else {
          setTyping(true);
          setI((x) => (x + 1) % ROWS.length);
        }
      },
      typing ? 900 : 3600
    );
    return () => clearTimeout(t);
  }, [typing]);

  const row = ROWS[i];
  return (
    <div className="in">
      <div>
        <h1>
          Your twin meets
          <br />
          <span key={i} className="rot">
            {row.line}
          </span>
        </h1>
        <p className="what">
          Jebln builds an AI twin of you, the founder. It meets other founders&apos; twins and brings back <b>the people worth meeting.</b>
        </p>
        <div className="cta">
          <a className="btn white" href="#join">Get your twin</a>
          <a className="btn ghost" href="#how">How it works</a>
        </div>
      </div>

      <div className="herobubble" aria-live="polite">
        <div className="hb-head">
          <span className="hb-av">J</span>
          Your twin
          <span className="hb-time">9:41 PM</span>
        </div>
        {typing ? (
          <div className="hb-typing">
            <i />
            <i />
            <i />
          </div>
        ) : (
          <div className="hb-bubble" key={i}>
            {row.text}
          </div>
        )}
      </div>
    </div>
  );
}
