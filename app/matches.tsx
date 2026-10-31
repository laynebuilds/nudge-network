"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/client";

type Match = { id: string; name: string; score: number; why: string; goal: string; demo: boolean };

// Ranked list of who your twin should talk to first, with one tap to send the twins in.
export default function Matches({ me }: { me: string }) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load(refresh = false) {
    setError("");
    setMatches(null);
    const res = await api<{ matches: Match[] }>(`/api/matches${refresh ? "?refresh=1" : ""}`);
    if (!res.ok) return setError(res.error);
    setMatches(res.body.matches ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function connect(m: Match) {
    setBusy(m.id);
    setError("");
    const res = await api<{ id: string }>("/api/runs", { method: "POST", body: { a: me, b: m.id, goal: m.goal } });
    if (res.ok) return router.push(`/runs/${res.body.id}/chat`);
    setError(res.error);
    setBusy("");
  }

  return (
    <section className="card">
      <h2>Your best matches</h2>
      <p className="muted">Your twin ranks everyone on the network by synergy and talks to the strongest matches first.</p>
      {!matches && !error && <p className="muted">Your twin is reading the network...</p>}
      {matches?.length === 0 && (
        <p className="muted">
          No matches yet. <a href="/me">Teach your twin more about you</a>, then re-rank.
        </p>
      )}
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
      {error && <p className="error">{error}</p>}
      {(matches || error) && (
        <button className="secondary" onClick={() => load(true)} disabled={!!busy}>
          {error && !matches ? "Try again" : "Re-rank"}
        </button>
      )}
    </section>
  );
}
