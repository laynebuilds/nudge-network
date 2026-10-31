"use client";

import { useEffect, useState } from "react";

// The rotating third line and the text from your twin change together.
const ROWS = [
  { line: "your next date.", text: "found someone. sam, west village, also hates loud bars. thursday at 8?" },
  { line: "your cofounder.", text: "maya needs a seller and you need a builder. her twin and i already agree on roles. intro?" },
  { line: "new friends.", text: "priya just moved here and plays pickleball as badly as you. sunday at 10?" },
  { line: "your first hire.", text: "kai's a designer in your time zone and cares more about equity than salary. call tuesday?" },
  { line: "your investors.", text: "marcus writes $50k checks in climate. his twin says he's free friday" },
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
          Jebln builds an AI twin from your texts and photos. It meets other twins and brings back <b>the people worth meeting.</b>
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
