"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/client";
import LivePhone from "./LivePhone";
import "./twin.css";

type Match = { id: string; name: string; score: number; why: string; goal: string; demo: boolean };

const pct = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

// One central column of the people your twin wants to meet, best first. Starting a conversation turns that
// card into the live phone, so the opening exchange plays right where you clicked.
export default function MatchList({ me, limit, startAllLabel }: { me: string; limit?: number; startAllLabel?: string }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState("");
  // match id -> run id, for every conversation started from this list.
  const [started, setStarted] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string[]>([]);

  async function load() {
    setError("");
    setMatches(null);
    const res = await api<{ matches: Match[] }>("/api/matches");
    if (!res.ok) return setError(res.error);
    setMatches(res.body.matches ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function start(m: Match): Promise<boolean> {
    setBusy((b) => [...b, m.id]);
    const res = await api<{ id: string }>("/api/runs", { method: "POST", body: { a: me, b: m.id, goal: m.goal } });
    setBusy((b) => b.filter((x) => x !== m.id));
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setStarted((s) => ({ ...s, [m.id]: res.body.id }));
    return true;
  }

  // One after another, so a failure stops the batch instead of leaving half of them racing.
  async function startAll() {
    setError("");
    for (const m of shown.filter((x) => !started[x.id])) {
      if (!(await start(m))) return;
    }
  }

  const shown = (matches ?? []).slice(0, limit ?? matches?.length);
  const allStarted = shown.length > 0 && shown.every((m) => started[m.id]);

  return (
    <div className="twin-col twin-matches">
      {!matches && !error && (
        <div className="twin-card twin-reading">
          <span className="twin-orb" aria-hidden />
          <p className="twin-pulse">Your twin is reading the network...</p>
        </div>
      )}

      {matches?.length === 0 && (
        <div className="twin-card">
          <p className="muted">
            No matches yet. <a href="/me">Teach your twin more about you</a> and it will find the right people.
          </p>
        </div>
      )}

      {startAllLabel && shown.length > 0 && !allStarted && (
        <button className="twin-start-all" onClick={startAll} disabled={busy.length > 0}>
          {busy.length > 0 ? "Starting..." : startAllLabel}
        </button>
      )}

      {shown.map((m) => {
        const runId = started[m.id];
        return (
          <article key={m.id} className={`twin-card twin-match${runId ? " live" : ""}`}>
            <div className="twin-match-top">
              <b className="twin-match-name">{m.name}</b>
              {m.demo && <span className="pill">demo</span>}
            </div>
            <p className="twin-score">
              <span>{pct(m.score)}%</span> likely to match
            </p>
            <p className="twin-why">{m.why}</p>
            {runId ? (
              <>
                <LivePhone runId={runId} side="a" />
                <a className="ob-link twin-open" href={`/runs/${runId}/chat`}>Open the full conversation</a>
              </>
            ) : (
              <>
                <p className="twin-goal">{m.goal}</p>
                <button onClick={() => start(m)} disabled={busy.includes(m.id)}>
                  {busy.includes(m.id) ? "Starting..." : "Start conversation"}
                </button>
              </>
            )}
          </article>
        );
      })}

      {error && (
        <p className="error">
          {error}{" "}
          {!matches && (
            <button className="ob-link" onClick={load}>Try again</button>
          )}
        </p>
      )}
    </div>
  );
}
