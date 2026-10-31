"use client";

import { useEffect, useState } from "react";

const WORDS = ["your next date.", "your cofounder.", "your new friends.", "your first hire.", "your investors."];

export default function Rotator() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="rot" aria-live="polite">
      <span key={i} className="rot-word">
        {WORDS[i]}
      </span>
    </span>
  );
}
