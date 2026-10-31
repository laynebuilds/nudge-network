"use client";

import { useEffect, useRef, useState } from "react";
import type { Founder, SealedIntent } from "../../lib/schemas";
import { api, useAutosave, type SaveState } from "../../lib/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LINK_FIELDS, LINK_META, linkError, normalizeLink, type LinkField, type LinkRead, type Links } from "../../lib/links";

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
  const [phone, setPhone] = useState("");
  const [links, setLinks] = useState<Links>({});
  const [linksRead, setLinksRead] = useState<Partial<Record<LinkField, LinkRead>>>({});
  const [error, setError] = useState<{ message: string; signedOut: boolean } | null>(null);
  const loaded = useRef(false);

  // Reloads after an edit keep the page as it is if they fail; only the first load can show an error.
  async function load() {
    const res = await api<{ founder: Founder; editable: string[]; phone: string; links: Links; links_read: Partial<Record<LinkField, LinkRead>> }>(
      "/api/me"
    );
    if (!res.ok) {
      if (!loaded.current) setError({ message: res.error, signedOut: res.status === 401 });
      return;
    }
    loaded.current = true;
    setError(null);
    setFounder(res.body.founder);
    setEditable(res.body.editable);
    setPhone(res.body.phone);
    setLinks(res.body.links);
    setLinksRead(res.body.links_read);
  }
  useEffect(() => {
    load();
  }, []);

  if (error)
    return (
      <section className="card">
        <p>{error.message}</p>
        {error.signedOut ? (
          <div className="row">
            <a className="button-link" href="/sign-up">Get your twin</a>
            <a className="button-link secondary" href="/sign-in">Sign in</a>
          </div>
        ) : (
          <div className="row">
            <button onClick={() => { setError(null); load(); }}>Try again</button>
          </div>
        )}
      </section>
    );
  if (!founder) return <p className="muted">Loading...</p>;

  return (
    <>
      <div className="page-head">
        <h1>Your twin</h1>
        <p className="lede">Your twin knows only what is on this page. Other twins never see your history, only what your twin chooses to say.</p>
      </div>
      <ProfileForm founder={founder} phone={phone} links={links} linksRead={linksRead} reload={load} />
      <Photos reload={load} />
      <details className="card more">
        <summary>More ways to teach your twin (optional)</summary>
        <About reload={load} />
        <Bookmark />
        <Connect founderId={founder.owner.id} reload={load} />
        <History founder={founder} editable={editable} reload={load} />
      </details>
      <Sealed />
      <section className="card next-step">
        <h2>Your twin is ready to meet people</h2>
        <p className="muted">It ranks everyone on the network by synergy. Pick a match and watch the twins talk.</p>
        <a className="button-link" href="/">See your matches</a>
      </section>
    </>
  );
}

function History({ founder, editable, reload }: { founder: Founder; editable: string[]; reload: () => void }) {
  const [source, setSource] = useState<(typeof SOURCES)[number]>("note");
  const [title, setTitle] = useState("");
  const [withWho, setWithWho] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const own = new Set(editable);

  const [busy, setBusy] = useState(false);

  async function add() {
    setMsg("");
    setBusy(true);
    const res = await api("/api/me/items", {
      method: "POST",
      body: { source, title: title || undefined, with: withWho || undefined, text },
    });
    setBusy(false);
    if (!res.ok) return setMsg(res.error);
    setTitle(""); setWithWho(""); setText("");
    setMsg("Added to your history.");
    reload();
  }

  async function upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setMsg("");
    let json;
    try {
      json = JSON.parse(await file.text());
    } catch {
      return setMsg("That file is not valid JSON.");
    }
    setBusy(true);
    const res = await api<{ added: number }>("/api/me/items", { method: "POST", body: json.items ?? json });
    setBusy(false);
    setMsg(res.ok ? `Added ${res.body.added} items.` : res.error);
    if (res.ok) reload();
  }

  async function remove(id: string) {
    setMsg("");
    const res = await api(`/api/me/items?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return setMsg(res.error);
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
          <Input label="With (optional)" value={withWho} onChange={(e) => setWithWho(e.target.value)} placeholder="Who it was with" />
        </div>
        <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Text" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a message thread, a note, a photo description..." />
        <div className="row">
          <button onClick={add} disabled={busy || !text.trim()}>{busy ? "Adding..." : "Add to history"}</button>
          <label className="file">
            Upload Nudge export (.json)
            <input type="file" accept="application/json" disabled={busy} onChange={(e) => upload(e.target)} />
          </label>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </div>
      <ul className="items">
        {[...founder.items].reverse().map((i) => (
          <li key={i.id}>
            <div className="who">
              <span className="src">{i.source}</span> {i.ts} {i.with && `with ${i.with}`} {i.title ?? i.subject}
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
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api<SealedIntent>("/api/me/sealed").then((res) => {
      if (!res.ok) return setLoadError(res.error);
      setSealed(res.body);
      setRedLines(res.body.red_lines.join("\n"));
      setProbes(res.body.probes.length ? res.body.probes : STARTER_PROBES.map((question) => ({ question, answer: "" })));
    });
  }, []);

  // Autosaved a moment after each edit. The server drops probes without an answer and renumbers the rest,
  // so the message says what was actually sealed.
  const autosave = useAutosave(
    { redLines, probes },
    async (v, _prev, { keepalive }) => {
      const res = await api<SealedIntent>("/api/me/sealed", {
        method: "PUT",
        keepalive,
        body: { red_lines: v.redLines.split("\n"), probes: v.probes.map((p, i) => ({ id: String(i), question: p.question, answer: p.answer })) },
      });
      if (!res.ok) return res.error;
      setMsg(`${res.body.red_lines.length} red lines and ${res.body.probes.length} answered probes sealed.`);
      return null;
    },
    { enabled: !!sealed }
  );

  if (loadError) return <section className="card"><p className="error">Could not load your answer key: {loadError}</p></section>;
  if (!sealed) return null;
  return (
    <details className="card more">
      <summary>Answer key for the scorecard (private, 2 minutes) <SaveBadge state={autosave.state} /></summary>
      <p className="muted">
        Only you see this. No agent and not the other person ever reads it. After a run, the scorer asks your twin to predict
        these answers blind and checks the final proposal against your red lines. Answer honestly and specifically; write it
        before you look at any run.
      </p>
      <div className="form">
        <Textarea
          label="Red lines (one per line)"
          rows={4}
          value={redLines}
          onChange={(e) => setRedLines(e.target.value)}
          placeholder="Things you will not do or accept, whatever the upside"
        />
        {probes.map((p, i) => (
          <div key={i} className="probe">
            <Input
              aria-label={`Probe ${i + 1} question`}
              value={p.question}
              onChange={(e) => setProbes(probes.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
            />
            <Input
              aria-label={`Probe ${i + 1} answer`}
              value={p.answer}
              placeholder="Your real answer"
              onChange={(e) => setProbes(probes.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
            />
          </div>
        ))}
        <div className="row">
          <button className="secondary" onClick={() => setProbes([...probes, { question: "", answer: "" }])}>Add a probe</button>
        </div>
        {autosave.state === "error" ? <SaveError error={autosave.error} retry={autosave.retry} /> : msg && <p className="muted">{msg}</p>}
      </div>
    </details>
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

function Connect({ founderId, reload }: { founderId: string; reload: () => void }) {
  const [chat, setChat] = useState("");
  const [myName, setMyName] = useState("");
  const [waMsg, setWaMsg] = useState("");
  const [waBusy, setWaBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [webMsg, setWebMsg] = useState("");
  const [webBusy, setWebBusy] = useState(false);

  async function addPage() {
    setWebBusy(true);
    setWebMsg("Reading page...");
    const res = await api<{ title: string }>("/api/me/web", { method: "POST", body: { url: url.trim() } });
    setWebBusy(false);
    setWebMsg(res.ok ? `Added: ${res.body.title}` : res.error);
    if (!res.ok) return;
    setUrl("");
    reload();
  }

  async function whatsapp(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setWaBusy(true);
    setWaMsg("Reading export...");
    let text: string;
    try {
      if (file.name.endsWith(".zip")) {
        const { unzipSync, strFromU8 } = await import("fflate");
        const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
        const txt = Object.keys(files).find((n) => n.endsWith(".txt"));
        if (!txt) {
          setWaBusy(false);
          return setWaMsg("No chat .txt inside that zip.");
        }
        text = strFromU8(files[txt]);
      } else {
        text = await file.text();
      }
    } catch {
      setWaBusy(false);
      return setWaMsg("Could not open that file. Export the chat again and upload the .zip or .txt.");
    }
    const name = chat || file.name.replace(/^WhatsApp Chat (with |- )?/i, "").replace(/\.(zip|txt)$/i, "");
    const res = await api<{ added: number }>("/api/me/whatsapp", { method: "POST", body: { text, chat: name, myName } });
    setWaBusy(false);
    setWaMsg(res.ok ? `Added ${res.body.added} message blocks from ${name}.` : res.error);
    if (res.ok) reload();
  }

  return (
    <section className="card">
      <h2>Connect your life</h2>
      <p className="muted">
        Plug in your main messaging app. That is where your real priorities, constraints and habits live, and it is what lets
        your twin decide like you instead of like a generic founder.
      </p>

      <h3>WhatsApp</h3>
      <p className="muted">
        In WhatsApp open a chat, tap the name, Export chat, Without media. Upload the .zip or .txt. Repeat for the chats that
        matter most (cofounders, family, close friends, investors).
      </p>
      <div className="pair">
        <Input label="Chat name" value={chat} onChange={(e) => setChat(e.target.value)} placeholder="From the file name if empty" />
        <Input label="Your name in that chat" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="As WhatsApp shows it" />
      </div>
      <label className="file">
        {waBusy ? "Working..." : "Upload WhatsApp export"}
        <input type="file" accept=".txt,.zip,text/plain,application/zip" disabled={waBusy} onChange={(e) => whatsapp(e.target)} />
      </label>
      {waMsg && <p className="muted">{waMsg}</p>}

      <h3>Your pages on the web</h3>
      <p className="muted">Your site, product pages, a post you wrote. Read with Firecrawl.</p>
      <div className="row url-row">
        <Input aria-label="Page address" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        <button onClick={addPage} disabled={webBusy || !url.trim()}>{webBusy ? "Reading..." : "Add page"}</button>
      </div>
      {webMsg && <p className="muted">{webMsg}</p>}

      <h3>iMessage and Apple Mail (Mac)</h3>
      <p className="muted">
        Uses Nudge to read your Mac locally, shows you the file, then uploads only what you keep. Run it from a checkout of
        this project. Your token is the last part of your invite link.
      </p>
      <pre className="cmd">{`NUDGE_TOKEN=your-token npm run ingest:nudge -- --id ${founderId} --contacts "Name One,Name Two" --days 90
# review .data/ingest/${founderId}.json, then:
NUDGE_TOKEN=your-token npm run upload -- --file .data/ingest/${founderId}.json --url ${typeof window === "undefined" ? "" : window.location.origin}`}</pre>
    </section>
  );
}

function About({ reload }: { reload: () => void }) {
  const [qs, setQs] = useState<{ question: string; answer: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    api<{ questions: { question: string; answer: string }[] }>("/api/me/about").then((res) => {
      if (!res.ok) return setMsg(`Could not load the questions: ${res.error}`);
      setQs(res.body.questions);
      setLoaded(true);
    });
  }, []);
  const autosave = useAutosave(
    qs.map((q) => q.answer),
    async (answers, _prev, { keepalive }) => {
      const res = await api<{ saved: number }>("/api/me/about", { method: "PUT", keepalive, body: { answers } });
      if (!res.ok) return res.error;
      setMsg(`${res.body.saved} answers saved. Your twin reads them in your own words.`);
      if (!keepalive) reload();
      return null;
    },
    { enabled: loaded }
  );
  return (
    <section className="card">
      <h2>In your own words <SaveBadge state={autosave.state} /></h2>
      <p className="muted">
        Ten questions about purpose, values and where you are heading. Your twin reads these answers, so answer the way you
        would to a close friend. A few honest sentences each beat a polished paragraph.
      </p>
      <div className="form">
        {qs.map((q, i) => (
          <Textarea
            key={i}
            label={`${i + 1}. ${q.question}`}
            rows={3}
            value={q.answer}
            onChange={(e) => setQs(qs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
          />
        ))}
        {autosave.state === "error" ? <SaveError error={autosave.error} retry={autosave.retry} /> : msg && <p className="muted">{msg}</p>}
      </div>
    </section>
  );
}

// Runs in the owner's own logged-in tab. It opens our capture page and hands it the page text by window
// message, because LinkedIn, X and Instagram block scripts from calling other domains directly.
const BOOKMARK = (origin: string) =>
  `javascript:(()=>{const o=${JSON.stringify(origin)};const w=window.open(o+'/capture','nudge','width=520,height=640');` +
  `const p={url:location.href,title:document.title,text:document.body.innerText.slice(0,70000),` +
  `images:[...document.images].map(i=>i.alt).filter(a=>a&&a.length>20).slice(0,60)};` +
  `const h=e=>{if(e.origin===o&&e.data&&e.data.type==='nudge-ready'){w.postMessage({type:'nudge-capture',page:p},o);removeEventListener('message',h)}};` +
  `addEventListener('message',h)})()`;

function Bookmark() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // React refuses javascript: URLs in JSX, so the bookmark's address is set directly.
    ref.current?.setAttribute("href", BOOKMARK(window.location.origin));
  }, []);
  return (
    <section className="card">
      <h2>Send pages to your twin from your browser</h2>
      <p className="muted">
        Works on LinkedIn, X, Instagram and any other page, because it reads what you already see while logged in.
      </p>
      <ol>
        <li>Drag this button to your bookmarks bar: <a ref={ref} className="bookmarklet" onClick={(e) => e.preventDefault()}>Send to my twin</a></li>
        <li>Open your LinkedIn profile (click &quot;see more&quot; on About), then click the bookmark and press Add.</li>
        <li>Do the same on your LinkedIn activity page, your X profile scrolled through your recent posts, and your Instagram profile.</li>
      </ol>
      <p className="muted">Only what the page says about you is kept, plus your own posts and captions word for word.</p>
    </section>
  );
}

function Photos({ reload }: { reload: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function photos(input: HTMLInputElement) {
    const list = [...(input.files ?? [])].slice(0, 120);
    input.value = "";
    if (!list.length) return;
    setBusy(true);
    let added = 0;
    let skipped = 0;
    let unreadable = 0;
    for (let i = 0; i < list.length; i += 6) {
      setMsg(`Reading photos ${i + 1} to ${Math.min(i + 6, list.length)} of ${list.length}...`);
      // A photo the browser cannot decode is skipped on its own instead of taking its whole batch down.
      const batch = (
        await Promise.all(
          list.slice(i, i + 6).map(async (f) => {
            try {
              return { name: f.name, data: await toJpeg(f), ts: new Date(f.lastModified).toISOString().slice(0, 10) };
            } catch {
              unreadable++;
              return null;
            }
          })
        )
      ).filter((x) => x !== null);
      if (!batch.length) continue;
      const res = await api<{ added: number; skipped: number }>("/api/me/photos", { method: "POST", body: { images: batch } });
      if (!res.ok) {
        setMsg(`${added ? `${added} photos added, then: ` : ""}${res.error}`);
        setBusy(false);
        if (added) reload();
        return;
      }
      added += res.body.added;
      skipped += res.body.skipped;
    }
    const notes = [skipped && `${skipped} skipped (no signal or sensitive)`, unreadable && `${unreadable} could not be opened`].filter(Boolean);
    setMsg(`${added} photos added to your twin${notes.length ? `, ${notes.join(", ")}` : ""}. The images were not stored.`);
    setBusy(false);
    reload();
  }
  return (
    <section className="card">
      <h2>Your photos</h2>
      <p className="muted">Pick 20 to 40 photos of your life and work. Only short notes about them are kept.</p>
      <label className="file">
        {busy ? "Working..." : "Choose photos"}
        <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => photos(e.target)} />
      </label>
      {msg && <p className="muted">{msg}</p>}
    </section>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Saving..." : state === "saved" ? "Saved" : "Not saved";
  return <span className={`save-state ${state}`} aria-live="polite">{text}</span>;
}

function SaveError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <p className="error">
      {error} <button className="link" onClick={retry}>Try again</button>
    </p>
  );
}

type Form = { name: string; public_bio: string; phone: string; links: Record<LinkField, string> };
type ReadState = { reading: boolean; ok: boolean; note: string };

const readText = (r: ReadState) =>
  r.reading ? "Reading..." : r.ok ? `Read${r.note.replace(/^read/i, "").replace(/^,\s*/, ": ")}` : `Could not read: ${r.note}`;

// The profile in designated fields. Everything autosaves a moment after you stop typing; a link that
// changed is read in the background once it is saved, and the result shows under its field.
function ProfileForm({
  founder,
  phone,
  links,
  linksRead,
  reload,
}: {
  founder: Founder;
  phone: string;
  links: Links;
  linksRead: Partial<Record<LinkField, LinkRead>>;
  reload: () => void;
}) {
  const [form, setForm] = useState<Form>(() => ({
    name: founder.owner.name,
    public_bio: founder.owner.public_bio,
    phone,
    links: Object.fromEntries(LINK_FIELDS.map((f) => [f, links[f] ?? ""])) as Record<LinkField, string>,
  }));
  // Last read per field, so a link is read again only when its saved value actually changes.
  const lastRead = useRef<Partial<Record<LinkField, string>>>(
    Object.fromEntries(LINK_FIELDS.map((f) => [f, linksRead[f]?.url])) as Partial<Record<LinkField, string>>
  );
  const [reads, setReads] = useState<Partial<Record<LinkField, ReadState>>>(() =>
    Object.fromEntries(
      LINK_FIELDS.filter((f) => linksRead[f] && linksRead[f]!.url === links[f]).map((f) => [f, { reading: false, ok: linksRead[f]!.ok, note: linksRead[f]!.note }])
    )
  );
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const errors: Record<string, string | null> = {
    name: form.name.trim() ? null : "Your name is required.",
    public_bio: form.public_bio.trim() ? null : "A short bio is required.",
    ...Object.fromEntries(
      LINK_FIELDS.map((f) => [f, linkError(f, form.links[f]) ?? (LINK_META[f].required && !form.links[f].trim() ? `Your ${LINK_META[f].label} is required.` : null)])
    ),
  };

  async function readLink(field: LinkField, url: string) {
    lastRead.current[field] = url;
    setReads((r) => ({ ...r, [field]: { reading: true, ok: false, note: "" } }));
    const res = await api<{ results: { ok: boolean; note: string }[] }>("/api/me/links", { method: "POST", body: { links: url, field } });
    const first = res.ok ? res.body.results[0] : null;
    if (!first) lastRead.current[field] = undefined;
    setReads((r) => ({ ...r, [field]: first ? { reading: false, ...first } : { reading: false, ok: false, note: res.ok ? "nothing came back" : res.error } }));
    if (first?.ok) reload();
  }

  const autosave = useAutosave(form, async (v, prev, { keepalive }) => {
    // Only fields that changed and pass validation are sent; an emptied required field keeps its old value.
    const body: { name?: string; public_bio?: string; phone?: string; links?: Links } = {};
    if (v.name !== prev.name && v.name.trim()) body.name = v.name;
    if (v.public_bio !== prev.public_bio && v.public_bio.trim()) body.public_bio = v.public_bio;
    if (v.phone !== prev.phone) body.phone = v.phone;
    const changed = LINK_FIELDS.filter((f) => v.links[f] !== prev.links[f] && !linkError(f, v.links[f]));
    if (changed.length) body.links = Object.fromEntries(changed.map((f) => [f, normalizeLink(v.links[f])]));
    if (!Object.keys(body).length) return null;
    const res = await api("/api/me", { method: "PUT", keepalive, body });
    if (!res.ok) return res.error;
    if (keepalive) return null;
    for (const f of changed) {
      const url = normalizeLink(v.links[f]);
      if (!url) setReads((r) => ({ ...r, [f]: undefined }));
      else if (url !== lastRead.current[f]) readLink(f, url);
    }
    if (body.name || body.public_bio !== undefined) reload();
    return null;
  });

  const set = (key: string, patch: (f: Form) => Form) => {
    setForm(patch);
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  };
  // Required fields that start empty (a new sign-up) are flagged from the start; other errors after typing.
  const show = (key: string) => (touched.has(key) || errors[key]?.includes("required") ? errors[key] : null);

  return (
    <section className="card">
      <h2>Profile <SaveBadge state={autosave.state} /></h2>
      <p className="muted">
        Fields marked <span className="req">*</span> are required. Changes save as you type. Each link is read once you add or
        change it: your twin keeps what it says about you and your own words. The bio is also what the baseline gets, so the
        scorecard can show how much your history adds.
      </p>
      <div className="form profile-form">
        <Input
          label={<>Name <span className="req">*</span></>}
          required
          value={form.name}
          onChange={(e) => set("name", (f) => ({ ...f, name: e.target.value }))}
          invalid={!!show("name")}
          errorMessage={show("name")}
        />
        <Textarea
          label={<>Short bio <span className="req">*</span></>}
          required
          rows={2}
          value={form.public_bio}
          placeholder="One or two lines: what you do and what you are looking for"
          onChange={(e) => set("public_bio", (f) => ({ ...f, public_bio: e.target.value }))}
          invalid={!!show("public_bio")}
          errorMessage={show("public_bio")}
        />
        <Input
          label={<>iMessage number <span className="muted">(optional, for opportunity texts)</span></>}
          type="tel"
          value={form.phone}
          placeholder="+1 415 555 0100"
          onChange={(e) => set("phone", (f) => ({ ...f, phone: e.target.value }))}
        />
        {LINK_FIELDS.map((field) => {
          const meta = LINK_META[field];
          const err = show(field);
          const read = reads[field];
          return (
            <div key={field} className="field-stack">
              <Input
                label={<>{meta.label} {meta.required ? <span className="req">*</span> : <span className="muted">(optional)</span>}</>}
                required={meta.required}
                type="url"
                inputMode="url"
                value={form.links[field]}
                placeholder={meta.placeholder}
                onChange={(e) => set(field, (f) => ({ ...f, links: { ...f.links, [field]: e.target.value } }))}
                invalid={!!err}
                errorMessage={err}
              />
              {/* The link read result is not an error, so it stays outside the field's own error slot. */}
              {!err && read ? (
                <small className={`field-note ${read.reading ? "" : read.ok ? "ok" : "bad"}`}>
                  {readText(read)}
                  {!read.reading && !read.ok && (
                    <>
                      {" "}
                      <button type="button" className="link" onClick={() => readLink(field, normalizeLink(form.links[field]))}>Try again</button>
                    </>
                  )}
                </small>
              ) : null}
            </div>
          );
        })}
        {autosave.state === "error" && <SaveError error={autosave.error} retry={autosave.retry} />}
        <Research reload={reload} />
      </div>
    </section>
  );
}

function Research({ reload }: { reload: () => void }) {
  type Result = { summary: string; facts: { fact: string; category?: string; url: string }[]; doubts: string[] };
  const [research, setResearch] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function researchMe() {
    setBusy(true);
    setError("");
    const res = await api<Result>("/api/me/research", { method: "POST" });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setResearch(res.body);
    reload();
  }
  return (
    <>
      <div className="row">
        <button className="secondary" onClick={researchMe} disabled={busy}>
          {busy ? "Searching the web for you..." : "Research me on the web"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {research && (
        <div>
          <p>{research.summary}</p>
          {research.facts.length === 0 && (
            <p className="muted">Nothing was added. Fill in your links above so your twin has something real to anchor on, then try again.</p>
          )}
          <ul className="link-results">
            {research.facts.map((f, i) => (
              <li key={i}><span className="pill">{f.category ?? "context"}</span> {f.fact}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
