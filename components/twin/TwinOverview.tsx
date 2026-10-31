"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/client";
import "./twin.css";

type Overview = { summary: string; rows: { label: string; value: string; source: string }[]; sources: string[] };

const SOURCE_LABEL: Record<string, string> = {
  bio: "Your bio",
  imessage: "iMessage",
  email: "Email",
  calendar: "Calendar",
  note: "Notes",
  photo: "Photos",
  doc: "Docs",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
  interview: "Your answers",
};

// What your twin knows about you, in one card: how it would describe you, the facts it leans on with where
// each came from, the red lines it will never cross, and how much it has to go on.
export default function TwinOverview({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<Overview | null>(null);
  const [redLines, setRedLines] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(refresh = false) {
    setError("");
    setBusy(true);
    const [o, s] = await Promise.all([api<Overview>(`/api/me/overview${refresh ? "?refresh=1" : ""}`), api<{ red_lines: string[] }>("/api/me/sealed")]);
    setBusy(false);
    if (s.ok) setRedLines(s.body.red_lines ?? []);
    if (!o.ok) return setError(o.error);
    setData(o.body);
  }
  useEffect(() => {
    load();
  }, []);

  const rows = data ? (compact ? data.rows.slice(0, 4) : data.rows) : [];
  const lines = compact ? redLines.slice(0, 3) : redLines;
  const missing = ["photo", "whatsapp"].filter((s) => !data?.sources.includes(s)).map((s) => (s === "photo" ? "photos" : "WhatsApp"));
  const n = data?.sources.length ?? 0;

  return (
    <section className={`twin-card twin-overview${compact ? " compact" : ""}`}>
      <div className="twin-card-head">
        <span className="eyebrow">Your twin</span>
        <a className="ob-link" href="/me">Edit</a>
      </div>

      {!data && !error && (
        <p className="muted twin-pulse">
          Your twin is reading everything it knows about you<span className="dots" aria-hidden><i /><i /><i /></span>
        </p>
      )}
      {error && (
        <p className="error">
          {error}{" "}
          <button className="ob-link" onClick={() => load(true)} disabled={busy}>Try again</button>
        </p>
      )}

      {data && (
        <>
          {data.summary ? (
            <p className="twin-summary">{data.summary}</p>
          ) : (
            <p className="muted">
              Your twin does not know much yet. <a href="/me">Give it your links and a few photos</a>.
            </p>
          )}

          {rows.length > 0 && (
            <>
              <h3>What it knows</h3>
              <dl className="twin-rows">
                {rows.map((r) => (
                  <div key={r.label + r.value}>
                    <dt>{r.label}</dt>
                    <dd>
                      {r.value}
                      <span className="twin-src">{SOURCE_LABEL[r.source] ?? r.source}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </>
      )}

      {lines.length > 0 && (
        <>
          <h3>What it will never agree to</h3>
          <ul className="twin-red">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )}

      {data && (
        <p className="twin-coverage">
          Knows you from {n} {n === 1 ? "source" : "sources"}.{" "}
          <a href="/me">{missing.length ? `Add ${missing.join(" or ")} to make it sharper.` : "Add more to make it sharper."}</a>
          {!compact && (
            <button className="ob-link" onClick={() => load(true)} disabled={busy}>
              {busy ? "Reading..." : "Refresh"}
            </button>
          )}
        </p>
      )}
    </section>
  );
}
