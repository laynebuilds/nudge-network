"use client";

import { useEffect, useState } from "react";
import type { RunView } from "../../lib/runs";
import { api } from "../../lib/client";
import "./twin.css";

type RunRow = { id: string; createdAt: string; a: { id: string; name: string }; b: { id: string; name: string }; stage: string; goal: string };

const LIVE = new Set(["researching", "negotiating", "mediating", "ratifying", "scoring"]);

// The latest few conversations, one line each: who, where it stands, and the headline so far.
export default function RecentConversations({ me, limit = 3 }: { me: string | null; limit?: number }) {
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [views, setViews] = useState<Record<string, RunView>>({});

  useEffect(() => {
    api<{ runs: RunRow[] }>("/api/runs").then((res) => {
      const latest = res.ok ? res.body.runs.slice(0, limit) : [];
      setRuns(latest);
      latest.forEach((r) =>
        api<RunView>(`/api/runs/${r.id}`).then((v) => v.ok && setViews((x) => ({ ...x, [r.id]: v.body })))
      );
    });
  }, [limit]);

  const status = (r: RunRow): { label: string; cls: string } => {
    const v = views[r.id];
    const stage = v?.stage ?? r.stage;
    if (stage === "error") return { label: "Stopped", cls: "error" };
    if (LIVE.has(stage)) return { label: "Talking", cls: "on" };
    const mine = me === r.b.id ? r.b : r.a;
    if (v && !v.decisions[mine.id]) return { label: "Needs you", cls: "partial" };
    return { label: "Done", cls: "done" };
  };

  return (
    <section className="twin-card twin-convos">
      <div className="twin-card-head">
        <span className="eyebrow">Conversations</span>
        <a className="ob-link" href="/inbox">Open inbox</a>
      </div>
      {!runs && <p className="muted twin-pulse">Loading...</p>}
      {runs?.length === 0 && <p className="muted">No conversations yet. Start one with a match above.</p>}
      <ul>
        {runs?.map((r) => {
          const v = views[r.id];
          const other = me === r.b.id ? r.a : r.b;
          const st = status(r);
          return (
            <li key={r.id}>
              <a href={`/runs/${r.id}/chat`}>
                <span className="twin-convo-top">
                  <b>{other.name}</b>
                  <span className={`pill ${st.cls}`}>{st.label}</span>
                </span>
                <span className="twin-convo-head">{v?.outcome?.headline ?? v?.transcript.at(-1)?.turn.message ?? r.goal}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
