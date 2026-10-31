"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Match = { id: string; name: string; score: number; why: string; goal: string; demo: boolean };

// Ranked list of who your twin should talk to first, with one tap to send the twins in.
export default function Matches({ me }: { me: string }) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState("");

  const load = (refresh = false) =>
    fetch(`/api/matches${refresh ? "?refresh=1" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setMatches(b.matches ?? []));
  useEffect(() => {
    load();
  }, []);

  async function connect(m: Match) {
    setBusy(m.id);
    const res = await fetch("/api/runs", { method: "POST", body: JSON.stringify({ a: me, b: m.id, goal: m.goal }) });
    const body = await res.json();
    if (res.ok) router.push(`/runs/${body.id}/chat`);
    else setBusy("");
  }

  return (
    <section className="card">
      <h2>Your best matches</h2>
      <p className="muted">Your twin ranks everyone on the network by synergy and talks to the strongest matches first.</p>
      {!matches && <p className="muted">Your twin is reading the network...</p>}
      <ul className="matches">
        {matches?.map((m) => (
          <li key={m.id}>
            <div className="match-score">{Math.round(m.score)}</div>
            <div className="match-body">
              <b>{m.name}</b>
              {m.demo && <span className="pill">demo</span>}
              <p>{m.why}</p>
              <p className="muted">{m.goal}</p>
            </div>
            <button onClick={() => connect(m)} disabled={!!busy}>{busy === m.id ? "Starting..." : "Let our twins talk"}</button>
          </li>
        ))}
      </ul>
      {matches && <button className="secondary" onClick={() => { setMatches(null); load(true); }}>Re-rank</button>}
    </section>
  );
}
