"use client";

import { useEffect, useState } from "react";
import Planet from "../landing/planet";

// First-run setup: four short screens instead of the full /me page. Everything saves through the
// same APIs /me uses, so the twin is identical either way.
const LOOKING = ["A cofounder", "A first hire", "Angels", "Advisors", "Design partners", "Other founders"];
const PRIVATE_QS = [
  "Lowest equity you'd accept with a cofounder?",
  "Would you move cities for this in the next 6 months?",
  "How many hours a week can you give right now?",
];
const STEPS = ["You", "Looking for", "Lines", "Texts"];
// Links are typed as just the username; the prefix is shown and added for them.
const SOCIALS = [
  { key: "linkedin", prefix: "linkedin.com/in/", base: "https://www.linkedin.com/in/", placeholder: "yourname" },
  { key: "x", prefix: "x.com/", base: "https://x.com/", placeholder: "handle" },
  { key: "instagram", prefix: "instagram.com/", base: "https://www.instagram.com/", placeholder: "handle" },
] as const;
// Accept a pasted full link or an @handle and keep only the username.
const handleOf = (v: string) =>
  v.trim().replace(/^https?:\/\//, "").replace(/^(www\.)?(linkedin\.com\/in|x\.com|twitter\.com|instagram\.com)\//, "").replace(/^@/, "").split(/[/?#]/)[0];

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [handles, setHandles] = useState<Record<string, string>>({ linkedin: "", x: "", instagram: "" });
  const [site, setSite] = useState("");
  const links = [
    ...SOCIALS.filter((x) => handles[x.key]).map((x) => x.base + handles[x.key]),
    site.trim() && (/^https?:\/\//.test(site.trim()) ? site.trim() : `https://${site.trim()}`),
  ]
    .filter(Boolean)
    .join("\n");
  const [looking, setLooking] = useState<string[]>([]);
  const [yes, setYes] = useState("");
  const [lines, setLines] = useState<string[]>(["", ""]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!b.founder) return setErr(b.error ?? "Sign in with your invite link.");
        setName(b.founder.owner.name ?? "");
        setBio(b.founder.owner.public_bio ?? "");
        setPhone(b.phone ?? "");
      });
    fetch("/api/me/sealed", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        if (s.red_lines?.length) setLines([...s.red_lines, ""]);
        if (s.probes?.length) setAnswers(PRIVATE_QS.map((q) => s.probes.find((p: { question: string }) => p.question === q)?.answer ?? ""));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  async function next() {
    setErr("");
    setBusy(true);
    try {
      if (step === 0) {
        await put("/api/me", { name, public_bio: bio });
        // Reading links takes a minute or two, so it runs in the background while they carry on.
        if (links.trim()) fetch("/api/me/links", { method: "POST", body: JSON.stringify({ links }) }).catch(() => {});
      }
      if (step === 1 && (looking.length || yes.trim())) {
        const text = [looking.length && `Looking for: ${looking.join(", ")}.`, yes.trim() && `What makes it a yes: ${yes.trim()}`]
          .filter(Boolean)
          .join("\n");
        await post("/api/me/items", { source: "note", title: "What I'm looking for", text });
      }
      if (step === 2) {
        await put("/api/me/sealed", {
          red_lines: lines.filter((l) => l.trim()),
          probes: PRIVATE_QS.map((question, i) => ({ id: String(i), question, answer: answers[i] })),
        });
      }
      if (step === 3) await put("/api/me", { phone });
      setStep(step + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  const canNext = [name.trim() && bio.trim(), true, lines.some((l) => l.trim()), true][step];

  if (step === STEPS.length) {
    return (
      <div className="ob">
        <div className="ob-done">
          <Planet size={64} />
          <h1>Your twin is ready.</h1>
          <p className="lead">It&apos;s reading what you gave it and will start meeting other founders&apos; twins. You&apos;ll hear from it when there&apos;s a decision.</p>
          <div className="ob-actions">
            <a className="btn" href="/">Open your inbox</a>
            <a className="ob-link" href="/me">Teach it more</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob">
      <div className="ob-card" key={step}>
        <div className="ob-progress" aria-hidden>
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? "on" : ""} />
          ))}
        </div>
        {step === 0 && (
          <>
            <h1>Who are you?</h1>
            <p className="lead">Your twin starts here. Other twins see this, so keep it true.</p>
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jasnoor Kaur" autoFocus /></label>
            <label>What you&apos;re building, in one line<input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Founder of Obeo. Weather and travel forecasts for athletes." /></label>
            <div className="links-in">
              <span className="links-label">Your links <span className="opt">optional</span></span>
              {SOCIALS.map((x) => (
                <label key={x.key} className="prefixed">
                  <span className="pre">{x.prefix}</span>
                  <input
                    value={handles[x.key]}
                    placeholder={x.placeholder}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setHandles({ ...handles, [x.key]: handleOf(e.target.value) })}
                  />
                </label>
              ))}
              <label className="prefixed">
                <span className="pre">https://</span>
                <input
                  value={site}
                  placeholder="yourcompany.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setSite(e.target.value.replace(/^https?:\/\//, ""))}
                />
              </label>
            </div>
            <p className="hint">Your twin reads these in the background and keeps only what&apos;s about you.</p>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Who should it find?</h1>
            <p className="lead">Pick as many as you like.</p>
            <div className="chips">
              {LOOKING.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`chip-btn ${looking.includes(l) ? "on" : ""}`}
                  onClick={() => setLooking(looking.includes(l) ? looking.filter((x) => x !== l) : [...looking, l])}
                >
                  {l}
                </button>
              ))}
            </div>
            <label>
              <span>What would make it a yes? <span className="opt">optional</span></span>
              <textarea rows={2} value={yes} onChange={(e) => setYes(e.target.value)} placeholder="Someone technical who's shipped in health, full time by January" />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h1>What won&apos;t you do?</h1>
            <p className="lead">Your twin will never agree to these. Only you can see this page.</p>
            {lines.map((l, i) => (
              <input
                key={i}
                value={l}
                placeholder={i === 0 ? "No relocating before next summer" : "Add another"}
                onChange={(e) => {
                  const v = [...lines];
                  v[i] = e.target.value;
                  if (i === lines.length - 1 && e.target.value) v.push("");
                  setLines(v);
                }}
              />
            ))}
            <div className="ob-private">
              <span>Three private answers</span>
              <p className="hint">We check your twin against these to see if it really knows you. No twin ever reads them.</p>
              {PRIVATE_QS.map((q, i) => (
                <label key={q}>
                  {q}
                  <input value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} />
                </label>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Where should it text you?</h1>
            <p className="lead">When your twin finds someone worth meeting, it texts you. Reply yes and it sets up the meeting.</p>
            <label>iMessage number<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 415 555 0100" inputMode="tel" /></label>
            <p className="hint">Only used for your twin&apos;s texts. You can skip this and use the inbox instead.</p>
          </>
        )}

        {err && <p className="error">{err}</p>}
        <div className="ob-actions">
          <button onClick={next} disabled={busy || !canNext}>
            {busy ? "Saving..." : step === STEPS.length - 1 ? "Finish" : "Continue"}
          </button>
          {step > 0 && (
            <button className="ob-link" onClick={() => setStep(step - 1)} disabled={busy}>
              Back
            </button>
          )}
          {(step === 1 || step === 3) && (
            <button className="ob-link" onClick={() => setStep(step + 1)} disabled={busy}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

async function put(url: string, body: unknown) {
  const res = await fetch(url, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
}
async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
}
