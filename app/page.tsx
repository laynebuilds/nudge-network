import { listFounders } from "../lib/founders";
import { listRuns } from "../lib/runs";
import { DEFAULT_GOAL } from "../lib/goal";
import { session } from "../lib/auth";
import StartForm from "./start-form";
import Story from "./landing/story";
import Hero from "./landing/hero";
import Reveal from "./landing/reveal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await session();
  if (!me) return <Landing />;

  const founders = await listFounders();
  const runs = (await listRuns()).filter((r) => me.admin || r.a.id === me.id || r.b.id === me.id);
  const real = founders.filter((f) => !f.demo);
  const choices = me.admin ? founders : founders.filter((f) => f.demo || f.id === me.id || !f.demo);
  const defA = me.id ?? real[0]?.id ?? founders[0].id;
  const defB = real.find((f) => f.id !== defA)?.id ?? founders.find((f) => f.id !== defA)!.id;

  return (
    <main>
      <div className="page-head">
        <span className="eyebrow">New meeting</span>
        <h1>Introduce two twins</h1>
        <p className="lede">Pick two people. Their twins talk it out, and you both get the proposal.</p>
      </div>

      <section className="card">
        {me.id && (
          <p className="muted">
            <a href="/me">Build your twin</a> before you run. The more real history it has, the more it acts like you.
          </p>
        )}
        <ul className="founders">
          {real.map((f) => (
            <li key={f.id}>
              <span className="avatar sm">{f.name[0]}</span>
              <b>{f.name}</b>
              <span className="muted">
                {f.items} history items, {f.sealed ? "intent sealed" : "no sealed intent yet"}
              </span>
            </li>
          ))}
        </ul>
        <StartForm founders={choices.map(({ id, name, demo }) => ({ id, name, demo }))} defaultA={defA} defaultB={defB} defaultGoal={DEFAULT_GOAL} />
      </section>

      <section className="card">
        <h2>Runs</h2>
        {runs.length === 0 && <p className="muted">No runs yet. Start one above.</p>}
        <ul className="runs">
          {runs.map((r) => (
            <li key={r.id}>
              <a href={`/runs/${r.id}`}>
                <span className="names">
                  {r.a.name}
                  <i>and</i>
                  {r.b.name}
                </span>
                <span>
                  <span className={`pill ${r.stage === "done" ? r.outcome?.verdict ?? "done" : r.stage}`}>
                    {r.stage === "done" && r.outcome ? r.outcome.verdict.replace("_", " ") : r.stage}
                  </span>
                </span>
                {r.outcome && <span className="head">{r.outcome.headline}</span>}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Landing() {
  return (
    <main className="wide landing">
      <Reveal />
      <section className="hero">
        <div className="media" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="shade" aria-hidden />
        <Hero />
      </section>

      <Story />

      <section className="sec wrap" id="for">
        <span className="eyebrow rv">What it&apos;s for</span>
        <h2 className="rv">Anyone worth meeting.</h2>
        <p className="lead rv">Point your twin at someone, or let it find them.</p>
        <div className="caps">
          {USES.map((u) => (
            <div key={u.title} className="cap rv">
              <b>{u.title}</b>
              <span className="cb">{u.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="trip wrap" id="proof">
        <span className="eyebrow rv">Does it work</span>
        <h2 className="rv">It answers like you would.</h2>
        <p className="lead rv">You seal your real answers first. Then we check your twin against them.</p>
        <div className="route">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d="M18 6 C 70 14, 80 30, 60 46 S 20 70, 72 94" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="stop">
            <small>Your twin</small>
            <b>88%</b>
            <p>of its answers matched what its owner really said.</p>
          </div>
          <div className="stop r">
            <small>Same AI, bio only</small>
            <b>38%</b>
            <p>Your history is what makes the difference.</p>
          </div>
          <div className="stop">
            <small>Red lines crossed</small>
            <b>0</b>
            <p>It never gave away something you wouldn&apos;t.</p>
          </div>
          <div className="stop r">
            <small>Backed by your history</small>
            <b>100%</b>
            <p>Every claim points to something real you said or did.</p>
          </div>
        </div>
        <p className="fine rv">Demo pair, first full run.</p>
      </section>

      <section className="sec wrap">
        <span className="eyebrow rv">Private by design</span>
        <h2 className="rv">Your twin keeps your secrets.</h2>
        <div className="knows">
          <div className="rv">
            <b>Built from your life</b>
            <p>WhatsApp, iMessage, Mail, photos and notes. Your own words beat any bio.</p>
          </div>
          <div className="rv">
            <b>Never shared</b>
            <p>Other twins only hear what helps. Photos become notes and are never stored.</p>
          </div>
          <div className="rv">
            <b>You make the call</b>
            <p>Nothing is agreed for you. Every intro waits for your yes.</p>
          </div>
        </div>
      </section>

      <section className="end" id="join">
        <div className="media" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="in">
          <h2>Ready when you are.</h2>
          <div>
            <p className="lead">Jebln is invite only for now. Open your invite link to get your twin.</p>
          </div>
        </div>
      </section>
      <div className="giant" aria-hidden>jebln</div>
    </main>
  );
}

const USES = [
  { title: "Dates", text: "she's free thursday and also hates loud bars. 8pm?" },
  { title: "Friends", text: "he plays pickleball as badly as you. sunday at 10?" },
  { title: "Cofounders", text: "she builds, you sell. her twin agreed to 55/45" },
  { title: "Hiring", text: "designer, your time zone, wants equity. call tuesday?" },
  { title: "Investors", text: "writes $50k checks in climate. free friday" },
  { title: "Plans", text: "6 of you free on the 14th. cabin's booked" },
];
