"use client";

import { useEffect, useState } from "react";

type Captured = { url: string; title: string; text: string; images?: string[] };

// Opened by the "Send to my twin" bookmark from the owner's own LinkedIn, X or Instagram tab. The page
// they were on posts its text here (sites block direct calls to other domains, so we hand off through a
// window message), and the owner confirms before anything is saved.
export default function CapturePage() {
  const [page, setPage] = useState<Captured | null>(null);
  const [status, setStatus] = useState("Waiting for the page you were on...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "nudge-capture" || !e.data.page) return;
      setPage(e.data.page as Captured);
      setStatus("");
    };
    window.addEventListener("message", onMessage);
    window.opener?.postMessage({ type: "nudge-ready" }, "*");
    const t = setTimeout(() => !page && setStatus("Nothing arrived. Use the Send to my twin bookmark from the page you want to capture."), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(t);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!page) return;
    setBusy(true);
    setStatus("Reading the page...");
    const res = await fetch("/api/me/capture", { method: "POST", body: JSON.stringify(page) });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setStatus(body.error);
    setStatus(`Added to your twin: ${body.summary}${body.quotes ? ` (${body.quotes} quotes in your own words)` : ""}`);
    setPage(null);
    setTimeout(() => window.close(), 4000);
  }

  return (
    <section className="card">
      <h1>Send to my twin</h1>
      {page && (
        <>
          <p>
            <b>{page.title}</b>
            <br />
            <span className="muted">{page.url}</span>
          </p>
          <p className="muted">{page.text.length.toLocaleString()} characters captured. Only what this page says about you is kept.</p>
          <div className="row">
            <button onClick={save} disabled={busy}>Add to my twin</button>
            <button className="secondary" onClick={() => window.close()}>Cancel</button>
          </div>
        </>
      )}
      {status && <p className="muted">{status}</p>}
    </section>
  );
}
