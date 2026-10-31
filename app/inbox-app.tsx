"use client";

import { useEffect, useRef, useState } from "react";
import type { RunView } from "../lib/runs";
import StartForm from "./start-form";

// Signed-in home: every conversation your twin is having, plus who it wants to talk to next.
// Same APIs as the old dashboard and run page; this is only a calmer way to look at them.
type RunRow = { id: string; createdAt: string; a: { id: string; name: string }; b: { id: string; name: string }; stage: string; goal: string };
type Match = { id: string; name: string; score: number; why: string; goal: string; demo: boolean };
type F = { id: string; name: string; demo: boolean };

const LIVE = new Set(["researching", "negotiating", "mediating", "ratifying", "scoring"]);
const STAGE_LINE: Record<string, string> = {
  researching: "Your twin is reading up on them",
  negotiating: "Your twins are talking",
  mediating: "Writing up a proposal",
  ratifying: "Checking it against what you both want",
  scoring: "Almost done",
  error: "This conversation stopped. Start it again from the full view.",
};
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

export default function InboxApp({
  me,
  founders,
  defaultA,
  defaultB,
  defaultGoal,
}: {
  me: string | null;
  founders: F[];
  defaultA: string;
  defaultB: string;
  defaultGoal: string;
}) {
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [views, setViews] = useState<Record<string, RunView>>({});
  const viewsRef = useRef(views);
  viewsRef.current = views;
  const [sel, setSel] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [setup, setSetup] = useState(false);
  const [starting, setStarting] = useState("");
  const [compose, setCompose] = useState(false);

  const loadRuns = () =>
    fetch("/api/runs", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setRuns(b.runs ?? []));

  useEffect(() => {
    loadRuns();
    const t = new URL(location.href).searchParams.get("t");
    if (t) setSel(t);
    if (me) {
      fetch("/api/matches", { cache: "no-store" })
        .then((r) => r.json())
        .then((b) => setMatches(b.matches ?? []))
        .catch(() => {});
      Promise.all([fetch("/api/me").then((r) => r.json()), fetch("/api/me/sealed").then((r) => r.json())])
        .then(([m, s]) => setSetup(!m.founder?.owner?.public_bio || !s.red_lines?.length || !m.phone))
        .catch(() => {});
    }
  }, [me]);

  // Full views for every run, so the list can say who's waiting on whom. Live ones refresh.
  useEffect(() => {
    if (!runs) return;
    const load = (id: string) =>
      fetch(`/api/runs/${id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v) => v && setViews((x) => ({ ...x, [id]: v })));
    runs.forEach((r) => load(r.id));
    const t = setInterval(() => runs.filter((r) => LIVE.has(viewsRef.current[r.id]?.stage ?? r.stage)).forEach((r) => load(r.id)), 4000);
    return () => clearInterval(t);
  }, [runs]);

  const side = (v: RunView | RunRow): "a" | "b" => (("party" in v && v.party) || (me === v.b.id ? "b" : "a")) as "a" | "b";
  const other = (v: RunView | RunRow) => (side(v) === "a" ? v.b : v.a);
  const mine = (v: RunView | RunRow) => (side(v) === "a" ? v.a : v.b);
  const status = (r: RunRow): "needs" | "live" | "waiting" | "done" | "error" => {
    const v = views[r.id];
    const stage = v?.stage ?? r.stage;
    if (stage === "error") return "error";
    if (LIVE.has(stage)) return "live";
    if (!v) return "done";
    const mineDecided = !!v.decisions[mine(v).id];
    const theirsDecided = !!v.decisions[other(v).id];
    if (!mineDecided) return "needs";
    return theirsDecided ? "done" : "waiting";
  };
  const ORDER = { needs: 0, live: 1, waiting: 2, error: 3, done: 4 };
  const sorted = [...(runs ?? [])].sort((x, y) => ORDER[status(x)] - ORDER[status(y)] || y.createdAt.localeCompare(x.createdAt));
  const current = sel ? views[sel] : sorted[0] ? views[sorted[0].id] : undefined;
  const selected = sel ?? sorted[0]?.id ?? null;

  function pick(id: string) {
    setSel(id);
    setCompose(false);
    history.replaceState(null, "", `/?t=${id}`);
  }

  async function connect(m: Match) {
    if (!me) return;
    setStarting(m.id);
    const res = await fetch("/api/runs", { method: "POST", body: JSON.stringify({ a: me, b: m.id, goal: m.goal }) });
    const body = await res.json();
    setStarting("");
    if (res.ok) {
      await loadRuns();
      pick(body.id);
    }
  }

  const LABEL = { needs: "Needs you", live: "Talking", waiting: "Waiting on them", done: "Done", error: "Stopped" };

  return (
    <div className="app">
      {setup && (
        <a className="setup" href="/welcome">
          <b>Finish setting up your twin</b>
          <span>Four quick questions so it can speak for you.</span>
        </a>
      )}

      <div className="inbox app-inbox">
        <aside className="ib-list">
          <div className="ib-new">
            <b>Inbox</b>
            <button className="ob-link" onClick={() => setCompose(!compose)}>
              {compose ? "Close" : "New conversation"}
            </button>
          </div>

          {runs && runs.length === 0 && <p className="ib-empty">No conversations yet. Your twin will start some, or begin one yourself.</p>}
          {sorted.map((r) => {
            const st = status(r);
            const v = views[r.id];
            const last = v?.transcript.at(-1)?.turn.message;
            return (
              <button key={r.id} className={`ib-item ${r.id === selected && !compose ? "on" : ""} ${st === "done" ? "passed" : ""}`} onClick={() => pick(r.id)}>
                <span className="ib-row">
                  <i className={`st ${st === "needs" ? "needs" : st === "live" ? "live" : ""}`} />
                  <b>{other(r).name}</b>
                  <span className="ib-tag">{LABEL[st]}</span>
                  <span className="ib-time">{ago(r.createdAt)}</span>
                </span>
                <span className="ib-snip">{v?.outcome?.headline ?? last ?? r.goal}</span>
              </button>
            );
          })}

          {matches.length > 0 && (
            <>
              <div className="ib-section">Your twin wants to meet</div>
              {matches.slice(0, 5).map((m) => (
                <div key={m.id} className="ib-match">
                  <span className="ib-row">
                    <b>{m.name}</b>
                    <span className="ib-time">{Math.round(m.score)}</span>
                  </span>
                  <span className="ib-snip">{m.why}</span>
                  <button className="secondary" disabled={!!starting} onClick={() => connect(m)}>
                    {starting === m.id ? "Starting..." : "Let our twins talk"}
                  </button>
                </div>
              ))}
            </>
          )}
        </aside>

        <section className="ib-pane">
          {compose ? (
            <div className="ib-compose">
              <h2>New conversation</h2>
              <p className="muted">Pick who your twin should talk to and what about.</p>
              <StartForm founders={founders} defaultA={defaultA} defaultB={defaultB} defaultGoal={defaultGoal} />
            </div>
          ) : current ? (
            <Thread key={current.id} v={current} side={side(current)} onSaved={(v) => setViews((x) => ({ ...x, [v.id]: v }))} />
          ) : (
            <div className="ib-blank">
              <p className="muted">{runs ? "Pick a conversation." : "Loading your inbox..."}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Thread({ v, side, onSaved }: { v: RunView; side: "a" | "b"; onSaved: (v: RunView) => void }) {
  const me = side === "a" ? v.a : v.b;
  const them = side === "a" ? v.b : v.a;
  const o = v.outcome;
  const body = useRef<HTMLDivElement>(null);
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const myDecision = v.decisions[me.id];
  const theirDecision = v.decisions[them.id];

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [v.transcript.length, v.stage]);

  async function decide(decision: "accept" | "reject" | "modify") {
    setErr("");
    const res = await fetch(`/api/runs/${v.id}/decision`, { method: "POST", body: JSON.stringify({ owner: me.id, decision, note }) });
    const b = await res.json();
    if (!res.ok) return setErr(b.error);
    setChanging(false);
    onSaved(b);
  }

  const WORD = { accept: "said yes", reject: "passed", modify: "asked for changes" } as const;

  return (
    <>
      <div className="ib-head">
        <b>{them.name}</b>
        <span className="ib-tag">{v.goal.length > 70 ? `${v.goal.slice(0, 70)}...` : v.goal}</span>
        <a className="ib-state" href={`/runs/${v.id}`}>Full view</a>
      </div>
      <div className="ib-body" ref={body}>
        {v.transcript.map((e, i) => (
          <div key={i} className={`ib-msg ${e.side === side ? "you" : "them"}`}>
            {e.turn.message}
          </div>
        ))}
        {STAGE_LINE[v.stage] && <div className="ib-act">{STAGE_LINE[v.stage]}</div>}
        {v.stage === "negotiating" && (
          <div className={`ib-msg typing ${v.transcript.at(-1)?.side === side ? "them" : "you"}`}>
            <i />
            <i />
            <i />
          </div>
        )}

        {o && v.stage === "done" && (
          <div className="ib-result">
            <div className="ib-r-title">{o.verdict === "no_fit" ? "Not a fit" : "Proposal"}</div>
            <p className="ib-r-head">{o.headline}</p>
            {o.proposal.length > 0 && (
              <dl>
                {o.proposal.map((p) => (
                  <div key={p.term}>
                    <dt>{p.term}</dt>
                    <dd>{p.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {myDecision && !changing ? (
              <p className="r-done">
                You {WORD[myDecision.decision]}. {theirDecision ? `${them.name} ${WORD[theirDecision.decision]}.` : `Waiting on ${them.name}.`}{" "}
                <button className="ob-link" onClick={() => setChanging(true)}>Change</button>
              </p>
            ) : changing ? (
              <div className="r-change">
                <textarea rows={2} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="What would you change?" />
                <div className="r-btns">
                  <button onClick={() => decide("modify")} disabled={!note.trim()}>Send to your twin</button>
                  <button className="secondary" onClick={() => decide("accept")}>Just say yes</button>
                  <button className="text" onClick={() => setChanging(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="r-btns">
                <button onClick={() => decide("accept")}>Yes</button>
                <button className="secondary" onClick={() => setChanging(true)}>Change</button>
                <button className="text" onClick={() => decide("reject")}>Pass</button>
              </div>
            )}
            {err && <p className="error">{err}</p>}
            <a className="ob-link r-more" href={`/runs/${v.id}`}>See how they got here</a>
          </div>
        )}
      </div>
    </>
  );
}
