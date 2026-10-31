"use client";

import { useLayoutEffect, useEffect, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Planet from "../landing/planet";
import Plasma from "../landing/plasma";
import { RoughSvg } from "@/components/ui/textarea-utils/RoughSvg";
import TwinOverview from "@/components/twin/TwinOverview";
import MatchList from "@/components/twin/MatchList";
import { TwinBuildOverlay, chipLabels } from "../me/twin-build";
import { api, type ApiResult } from "@/lib/client";
import type { Founder } from "@/lib/schemas";

// Sketch fields draw in the current text color, so they read on the plasma and on paper alike.
const INK = "currentColor";

// First-run setup: four short screens instead of the full /me page. Everything saves through the
// same APIs /me uses, so the twin is identical either way.
const LOOKING = ["A cofounder", "A first hire", "Angels", "Advisors", "Design partners", "Other founders"];
const PRIVATE_QS = [
  "Lowest equity you'd accept with a cofounder?",
  "Would you move cities for this in the next 6 months?",
  "How many hours a week can you give right now?",
];
const STEPS = ["You", "Looking for", "Lines", "Texts"];
// After Finish: the twin builds for real (up to a minute), shows itself, then who it wants to meet.
const BUILD_MAX_MS = 60_000;
const BUILD_STAGES = ["Building your twin"];
type LinksRead = ApiResult<{ results: { ok: boolean }[] }>;
// Links are typed as just the username; the prefix is shown and added for them.
const SOCIALS = [
  { key: "linkedin", prefix: "linkedin.com/in/", base: "https://www.linkedin.com/in/", placeholder: "yourname" },
  { key: "x", prefix: "x.com/", base: "https://x.com/", placeholder: "handle" },
  { key: "instagram", prefix: "instagram.com/", base: "https://www.instagram.com/", placeholder: "handle" },
  { key: "github", prefix: "github.com/", base: "https://github.com/", placeholder: "handle" },
] as const;
// Accept a pasted full link or an @handle and keep only the username.
const handleOf = (v: string) =>
  v.trim().replace(/^https?:\/\//, "").replace(/^(www\.)?(linkedin\.com\/in|x\.com|twitter\.com|instagram\.com|github\.com)\//, "").replace(/^@/, "").split(/[/?#]/)[0];

export default function Welcome() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [handles, setHandles] = useState<Record<string, string>>({ linkedin: "", x: "", instagram: "", github: "" });
  const [site, setSite] = useState("");
  // Same fields /me uses, so the profile form shows them filled in.
  const linkFields: Record<string, string> = {
    ...Object.fromEntries(SOCIALS.map((x) => [x.key, handleOf(handles[x.key]) ? x.base + handleOf(handles[x.key]) : ""])),
    website: site.trim() ? `https://${site.trim().replace(/^https?:\/\//, "")}` : "",
  };
  const links = Object.values(linkFields).filter(Boolean).join("\n");
  const [looking, setLooking] = useState<string[]>([]);
  const [yes, setYes] = useState("");
  const [lines, setLines] = useState<string[]>(["", ""]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [phone, setPhone] = useState("");

  const [founder, setFounder] = useState<Founder | null>(null);
  const [beat, setBeat] = useState<"build" | "twin" | "meet">("build");
  const [chips, setChips] = useState<string[]>([]);
  const linksJob = useRef<Promise<LinksRead> | null>(null);
  const started = useRef(false);
  const [linksDone, setLinksDone] = useState(false);
  const [researchDone, setResearchDone] = useState(false);
  const [found, setFound] = useState(0);
  const [ranked, setRanked] = useState<number | null>(null);
  const [workDone, setWorkDone] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!b.founder) return setErr(b.error ?? "Sign in with your invite link.");
        setFounder(b.founder);
        setName(b.founder.owner.name ?? "");
        setBio(b.founder.owner.public_bio ?? "");
        setPhone(b.phone ?? "");
        const l = b.links ?? {};
        setHandles({ linkedin: handleOf(l.linkedin ?? ""), x: handleOf(l.x ?? ""), instagram: handleOf(l.instagram ?? ""), github: handleOf(l.github ?? "") });
        setSite((l.website ?? "").replace(/^https?:\/\//, ""));
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
  }, [step, beat]);

  // Finish starts the real build: links, web research and match ranking run side by side, and the
  // overview is rewritten once what was read has landed. Any of them may fail; the build still ends.
  useEffect(() => {
    if (step !== STEPS.length || started.current) return;
    started.current = true;
    setChips(chipLabels(founder?.items ?? [], linkFields));
    const job: Promise<LinksRead | null> = linksJob.current ?? (links.trim() ? readLinks(links) : Promise.resolve(null));
    const read = job.then((r) => {
      if (r?.ok) setFound((n) => n + r.body.results.filter((x) => x.ok).length);
      setLinksDone(true);
    });
    const research = api<{ facts: unknown[] }>("/api/me/research", { method: "POST" }).then((r) => {
      if (r.ok) setFound((n) => n + r.body.facts.length);
      setResearchDone(true);
    });
    const matches = api<{ matches: unknown[] }>("/api/matches?refresh=1").then((r) => setRanked(r.ok ? r.body.matches.length : 0));
    const overview = Promise.all([read, research]).then(() => api("/api/me/overview?refresh=1"));
    Promise.all([matches, overview]).then(() => setWorkDone(true));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function next() {
    setErr("");
    setBusy(true);
    try {
      if (step === 0) {
        await put("/api/me", { name, public_bio: bio, links: linkFields });
        // Reading links takes a minute or two, so it runs in the background while they carry on.
        // Kept so Finish can wait on it instead of reading the links twice.
        if (links.trim()) linksJob.current = readLinks(links);
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
      if (step === 3) await put("/api/me", { phone: e164(phone) });
      setStep(step + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
    setBusy(false);
  }

  // Photon texts founders at this number, so it's required: at least 10 digits, country code welcome.
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const canNext = [name.trim() && bio.trim() && handleOf(handles.linkedin), true, lines.some((l) => l.trim()), phoneOk][step];

  const shell = (children: React.ReactNode) => (
    <main className="wide landing ob-page">
      <Plasma />
      <div className="ob">{children}</div>
    </main>
  );

  if (step === STEPS.length && beat === "build") {
    const things = `${found} thing${found === 1 ? "" : "s"}`;
    const status = !linksDone
      ? handleOf(handles.linkedin) ? "Reading your LinkedIn" : "Reading your links"
      : !researchDone
        ? found ? `Found ${things} about you. Searching the web for more` : "Searching the web for you"
        : ranked === null
          ? `Found ${things} about you. Ranking founders for you`
          : `Ranked ${ranked} founder${ranked === 1 ? "" : "s"}. Writing how your twin describes you`;
    return shell(
      <TwinBuildOverlay
        chips={chips}
        stages={BUILD_STAGES}
        duration={BUILD_MAX_MS}
        done={workDone}
        status={status}
        onReady={() => setBeat("twin")}
        onClose={() => setBeat("twin")}
      />
    );
  }

  if (step === STEPS.length && beat === "twin") {
    return shell(
      <div className="ob-done ob-wide">
        <Planet size={64} />
        <h1>Here&apos;s your twin</h1>
        <p className="lead">This is how it will introduce you to other founders&apos; twins. Fix anything that&apos;s off before it meets anyone.</p>
        <div className="ob-panel">
          <TwinOverview />
        </div>
        <div className="ob-actions">
          <button className="ob-primary" onClick={() => setBeat("meet")}>Continue</button>
        </div>
      </div>
    );
  }

  if (step === STEPS.length) {
    return shell(
      <div className="ob-done ob-wide">
        <h1>Who your twin wants to meet first</h1>
        <p className="lead">Ranked from everything it knows about you. Say the word and it opens these conversations for you.</p>
        <div className="ob-panel">{founder && <MatchList me={founder.owner.id} limit={3} startAllLabel="Let my twin start these 3" />}</div>
        <div className="ob-actions">
          <a className="btn white" href="/">Go to home</a>
          <a className="ob-link" href="/">Pick myself</a>
        </div>
      </div>
    );
  }

  return shell(
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
          <Input sketchColor={INK} size="lg" label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jasnoor Kaur" autoFocus />
          <Input
            sketchColor={INK} size="lg"
            label="What you're building, in one line"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Founder of Obeo. Weather and travel forecasts for athletes."
          />
          <div className="links-in">
            <span className="links-label">
              Your links <span className="opt">LinkedIn is required, the rest are optional</span>
            </span>
            {SOCIALS.map((x) => (
              <PrefixInput
                key={x.key}
                prefix={x.prefix}
                value={handles[x.key]}
                placeholder={x.placeholder}
                onChange={(e) => setHandles({ ...handles, [x.key]: e.target.value })}
                onBlur={(e) => setHandles({ ...handles, [x.key]: handleOf(e.target.value) })}
              />
            ))}
            <PrefixInput
              prefix="https://"
              value={site}
              placeholder="yourcompany.com"
              onChange={(e) => setSite(e.target.value)}
              onBlur={(e) => setSite(e.target.value.trim().replace(/^https?:\/\//, ""))}
            />
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
              <SketchChip
                key={l}
                label={l}
                seed={l.length * 7 + 3}
                on={looking.includes(l)}
                onClick={() => setLooking(looking.includes(l) ? looking.filter((x) => x !== l) : [...looking, l])}
              />
            ))}
          </div>
          <Textarea
            sketchColor={INK} size="lg"
            label="What would make it a yes? (optional)"
            rows={2}
            value={yes}
            onChange={(e) => setYes(e.target.value)}
            placeholder="Someone technical who's shipped in health, full time by January"
          />
        </>
      )}

      {step === 2 && (
        <>
          <h1>What won&apos;t you do?</h1>
          <p className="lead">Your twin will never agree to these. Only you can see this page.</p>
          {lines.map((l, i) => (
            <Input
              key={i}
              sketchColor={INK} size="lg"
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
              <Input key={q} sketchColor={INK} size="lg" label={q} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} />
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1>Where should it text you?</h1>
          <p className="lead">When your twin finds someone worth meeting, it texts you. Reply yes and it sets up the meeting.</p>
          <Input sketchColor={INK} size="lg" label="iMessage number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 415 555 0100" inputMode="tel" />
          <p className="hint">Required. Only used for your twin&apos;s texts. Include your country code, like +1.</p>
        </>
      )}

      {err && <p className="error">{err}</p>}
      <div className="ob-actions">
        <button className="ob-primary" onClick={next} disabled={busy || !canNext}>
          {busy ? "Saving..." : step === STEPS.length - 1 ? "Finish" : "Continue"}
        </button>
        {step > 0 && (
          <button className="ob-link" onClick={() => setStep(step - 1)} disabled={busy}>
            Back
          </button>
        )}
        {step === 1 && (
          <button className="ob-link" onClick={() => setStep(step + 1)} disabled={busy}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

// A choice drawn like the sketch fields: outlined when off, filled in when picked.
function SketchChip({ label, on, seed, onClick }: { label: string; on: boolean; seed: number; onClick: () => void }) {
  return (
    <button type="button" className={`sketch-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>
      <RoughSvg sketchColor="currentColor" seed={seed} roughness={1.4} strokeWidth={1.75} fillStyle={on ? "solid" : undefined} />
      <span>{label}</span>
    </button>
  );
}

// A sketch field with a fixed prefix (linkedin.com/in/) drawn inside it, so people type only their username.
function PrefixInput({ prefix, ...props }: { prefix: string } & ComponentProps<typeof Input>) {
  const pre = useRef<HTMLSpanElement>(null);
  const [pad, setPad] = useState(0);
  useLayoutEffect(() => setPad(pre.current?.offsetWidth ?? 0), [prefix]);
  return (
    <div className="prefix-field">
      <span ref={pre} className="prefix-text" aria-hidden>
        {prefix}
      </span>
      <Input
        sketchColor={INK} size="lg"
        aria-label={`${prefix} username`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        style={{ paddingLeft: pad ? pad + 18 : undefined }}
        {...props}
      />
    </div>
  );
}

// Photon matches replies by exact number, so store it the way iMessage reports it: +<country><number>.
// A bare 10-digit number is taken as US/Canada.
function e164(raw: string) {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return `+${d}`;
}

// Reading links takes a minute or two; the result says how many were read.
function readLinks(links: string): Promise<LinksRead> {
  return api<{ results: { ok: boolean }[] }>("/api/me/links", { method: "POST", body: { links } });
}

async function put(url: string, body: unknown) {
  const res = await fetch(url, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
}
async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not save.");
}
