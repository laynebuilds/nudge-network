"use client";

import { useEffect, useState } from "react";
import type { Founder, SealedIntent } from "../../lib/schemas";

const SOURCES = ["note", "imessage", "whatsapp", "email", "calendar", "photo", "doc"] as const;
const STARTER_PROBES = [
  "What is the most important thing you want out of working together?",
  "Would you move cities for this in the next 6 months?",
  "How many hours a week could you put in right now?",
  "What would make you walk away immediately?",
  "Would you split equity 50/50?",
];

export default function MePage() {
  const [founder, setFounder] = useState<Founder | null>(null);
  const [editable, setEditable] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/me", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) return setError(body.error);
    setFounder(body.founder);
    setEditable(body.editable);
  }
  useEffect(() => {
    load();
  }, []);

  if (error) return <section className="card"><p className="error">{error}</p></section>;
  if (!founder) return <p className="muted">Loading...</p>;

  return (
    <>
      <Profile founder={founder} />
      <Connect reload={load} />
      <History founder={founder} editable={editable} reload={load} />
      <Sealed />
    </>
  );
}

function Profile({ founder }: { founder: Founder }) {
  const [name, setName] = useState(founder.owner.name);
  const [bio, setBio] = useState(founder.owner.public_bio);
  const [saved, setSaved] = useState(false);
  async function save() {
    await fetch("/api/me", { method: "PUT", body: JSON.stringify({ name, public_bio: bio }) });
    setSaved(true);
  }
  return (
    <section className="card">
      <h1>Your twin</h1>
      <p className="muted">
        Your twin knows only what is on this page. The other person&apos;s twin never sees your history directly, only what your
        twin chooses to say. The public bio is also what the baseline gets, so the scorecard can show how much your history adds.
      </p>
      <div className="form">
        <label>Name<input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} /></label>
        <label>Public bio<textarea rows={2} value={bio} onChange={(e) => { setBio(e.target.value); setSaved(false); }} /></label>
        <div className="row"><button onClick={save}>{saved ? "Saved" : "Save"}</button></div>
      </div>
    </section>
  );
}

function History({ founder, editable, reload }: { founder: Founder; editable: string[]; reload: () => void }) {
  const [source, setSource] = useState<(typeof SOURCES)[number]>("note");
  const [title, setTitle] = useState("");
  const [withWho, setWithWho] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const own = new Set(editable);

  async function add() {
    setMsg("");
    const res = await fetch("/api/me/items", {
      method: "POST",
      body: JSON.stringify({ source, title: title || undefined, with: withWho || undefined, text }),
    });
    const body = await res.json();
    if (!res.ok) return setMsg(body.error);
    setTitle(""); setWithWho(""); setText("");
    reload();
  }

  async function upload(file: File) {
    setMsg("");
    try {
      const json = JSON.parse(await file.text());
      const res = await fetch("/api/me/items", { method: "POST", body: JSON.stringify(json.items ?? json) });
      const body = await res.json();
      setMsg(res.ok ? `Added ${body.added} items.` : body.error);
      reload();
    } catch {
      setMsg("That file is not valid JSON.");
    }
  }

  async function remove(id: string) {
    await fetch(`/api/me/items?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    reload();
  }

  return (
    <section className="card">
      <h2>History ({founder.items.length} items)</h2>
      <p className="muted">
        Add what a twin needs to act like you: messages about what you want, constraints (money, time, location, family),
        past decisions, things you said no to. Paste real texts and notes; your own words beat summaries.
      </p>
      <div className="form">
        <div className="pair">
          <label>Source
            <select value={source} onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number])}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>With (optional)<input value={withWho} onChange={(e) => setWithWho(e.target.value)} placeholder="Who it was with" /></label>
        </div>
        <label>Title (optional)<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Text<textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a message thread, a note, a photo description..." /></label>
        <div className="row">
          <button onClick={add} disabled={!text.trim()}>Add to history</button>
          <label className="file">
            Upload Nudge export (.json)
            <input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </div>
      <ul className="items">
        {[...founder.items].reverse().map((i) => (
          <li key={i.id}>
            <div className="who">
              {i.source} {i.ts} {i.with && `with ${i.with}`} {i.title ?? i.subject}
              {own.has(i.id) ? <button className="link" onClick={() => remove(i.id)}>remove</button> : <span className="pill">public seed</span>}
            </div>
            <p>{(i.caption ?? i.text ?? "").slice(0, 400)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sealed() {
  const [sealed, setSealed] = useState<SealedIntent | null>(null);
  const [redLines, setRedLines] = useState("");
  const [probes, setProbes] = useState<{ question: string; answer: string }[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/me/sealed", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: SealedIntent) => {
        setSealed(s);
        setRedLines(s.red_lines.join("\n"));
        setProbes(s.probes.length ? s.probes : STARTER_PROBES.map((question) => ({ question, answer: "" })));
      });
  }, []);

  async function save() {
    const res = await fetch("/api/me/sealed", {
      method: "PUT",
      body: JSON.stringify({ red_lines: redLines.split("\n"), probes: probes.map((p, i) => ({ id: String(i), ...p })) }),
    });
    const body = await res.json();
    setMsg(res.ok ? `Sealed. ${body.red_lines.length} red lines, ${body.probes.length} probes.` : body.error);
  }

  if (!sealed) return null;
  return (
    <section className="card">
      <h2>Sealed intent</h2>
      <p className="muted">
        Only you see this. No agent and not the other person ever reads it. After a run, the scorer asks your twin to predict
        these answers blind and checks the final proposal against your red lines. Answer honestly and specifically; write it
        before you look at any run.
      </p>
      <div className="form">
        <label>Red lines (one per line)
          <textarea rows={4} value={redLines} onChange={(e) => setRedLines(e.target.value)} placeholder="Things you will not do or accept, whatever the upside" />
        </label>
        {probes.map((p, i) => (
          <div key={i} className="probe">
            <input value={p.question} onChange={(e) => setProbes(probes.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
            <input value={p.answer} placeholder="Your real answer" onChange={(e) => setProbes(probes.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
          </div>
        ))}
        <div className="row">
          <button className="secondary" onClick={() => setProbes([...probes, { question: "", answer: "" }])}>Add a probe</button>
          <button onClick={save}>Save sealed intent</button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </div>
    </section>
  );
}

// Resize in the browser so phone photos (including HEIC, which Safari decodes) go up as small JPEGs.
async function toJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
}

function Connect({ reload }: { reload: () => void }) {
  const [photoMsg, setPhotoMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState("");
  const [myName, setMyName] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [url, setUrl] = useState("");
  const [webMsg, setWebMsg] = useState("");

  async function addPage() {
    setWebMsg("Reading page...");
    const res = await fetch("/api/me/web", { method: "POST", body: JSON.stringify({ url }) });
    const body = await res.json();
    setWebMsg(res.ok ? `Added: ${body.title}` : body.error);
    if (res.ok) setUrl("");
    reload();
  }

  async function photos(files: FileList) {
    setBusy(true);
    const list = [...files].slice(0, 120);
    let added = 0;
    let skipped = 0;
    for (let i = 0; i < list.length; i += 6) {
      setPhotoMsg(`Reading photos ${i + 1} to ${Math.min(i + 6, list.length)} of ${list.length}...`);
      const batch = await Promise.all(
        list.slice(i, i + 6).map(async (f) => ({
          name: f.name,
          data: await toJpeg(f),
          ts: new Date(f.lastModified).toISOString().slice(0, 10),
        }))
      ).catch(() => null);
      if (!batch) {
        skipped += 6;
        continue;
      }
      const res = await fetch("/api/me/photos", { method: "POST", body: JSON.stringify({ images: batch }) });
      const body = await res.json();
      if (!res.ok) {
        setPhotoMsg(body.error);
        setBusy(false);
        return;
      }
      added += body.added;
      skipped += body.skipped;
    }
    setPhotoMsg(`Done. ${added} photos became history, ${skipped} skipped (no signal or sensitive). The images were not stored.`);
    setBusy(false);
    reload();
  }

  async function whatsapp(file: File) {
    setWaMsg("Reading export...");
    let text: string;
    if (file.name.endsWith(".zip")) {
      const { unzipSync, strFromU8 } = await import("fflate");
      const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const txt = Object.keys(files).find((n) => n.endsWith(".txt"));
      if (!txt) return setWaMsg("No chat .txt inside that zip.");
      text = strFromU8(files[txt]);
    } else {
      text = await file.text();
    }
    const name = chat || file.name.replace(/^WhatsApp Chat (with |- )?/i, "").replace(/\.(zip|txt)$/i, "");
    const res = await fetch("/api/me/whatsapp", { method: "POST", body: JSON.stringify({ text, chat: name, myName }) });
    const body = await res.json();
    setWaMsg(res.ok ? `Added ${body.added} message blocks from ${name}.` : body.error);
    reload();
  }

  return (
    <section className="card">
      <h2>Connect your life</h2>
      <p className="muted">
        Plug in your main messaging app and your camera roll. That is where your real priorities, constraints and habits live,
        and it is what lets your twin decide like you instead of like a generic founder.
      </p>

      <h3>Photo gallery</h3>
      <p className="muted">
        Pick photos that show your life and work: whiteboards, places, people you spend time with, what you build. Claude writes
        a short note per photo; only the notes are kept.
      </p>
      <label className="file">
        {busy ? "Working..." : "Choose photos"}
        <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => e.target.files?.length && photos(e.target.files)} />
      </label>
      {photoMsg && <p className="muted">{photoMsg}</p>}

      <h3>WhatsApp</h3>
      <p className="muted">
        In WhatsApp open a chat, tap the name, Export chat, Without media. Upload the .zip or .txt. Repeat for the chats that
        matter most (cofounders, family, close friends, investors).
      </p>
      <div className="pair">
        <label>Chat name<input value={chat} onChange={(e) => setChat(e.target.value)} placeholder="From the file name if empty" /></label>
        <label>Your name in that chat<input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="As WhatsApp shows it" /></label>
      </div>
      <label className="file">
        Upload WhatsApp export
        <input type="file" accept=".txt,.zip,text/plain,application/zip" onChange={(e) => e.target.files?.[0] && whatsapp(e.target.files[0])} />
      </label>
      {waMsg && <p className="muted">{waMsg}</p>}

      <h3>Your pages on the web</h3>
      <p className="muted">Your site, product pages, a post you wrote. Read with Firecrawl.</p>
      <div className="row">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        <button onClick={addPage} disabled={!url}>Add page</button>
      </div>
      {webMsg && <p className="muted">{webMsg}</p>}

      <h3>iMessage and Apple Mail (Mac)</h3>
      <p className="muted">
        Uses Nudge to read your Mac locally, shows you the file, then uploads only what you keep. Your token is the last part of
        your invite link.
      </p>
      <pre className="cmd">{`NUDGE_TOKEN=your-token npm run ingest:nudge -- --id your-id --contacts "Name One,Name Two" --days 90
# review .data/ingest/your-id.json, then:
NUDGE_TOKEN=your-token npm run upload -- --file .data/ingest/your-id.json --url ${typeof window === "undefined" ? "" : window.location.origin}`}</pre>
    </section>
  );
}
