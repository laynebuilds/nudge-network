import { loadFounder } from "../lib/founders";
import { session } from "../lib/auth";
import TwinOverview from "../components/twin/TwinOverview";
import MatchList from "../components/twin/MatchList";
import RecentConversations from "../components/twin/RecentConversations";
import "../components/twin/twin.css";
import Story from "./landing/story";
import Hero from "./landing/hero";
import Reveal from "./landing/reveal";
import Inbox from "./landing/inbox";
import Plasma from "./landing/plasma";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ landing?: string }> }) {
  const me = await session();
  // The logo always opens the landing page, signed in or not (?landing=1); "Home" in the nav is the dashboard.
  if (!me || (await searchParams).landing !== undefined) return <Landing />;

  // Signed-in home: one column with what your twin knows, who it wants to meet and how it is going.
  // Local development without auth has no founder id, so only the conversations show.
  const name = me.id ? (await loadFounder(me.id).catch(() => null))?.owner.name : null;
  const first = name?.split(" ")[0];

  return (
    <main className="twin-home">
      <div className="twin-col">
        <header className="twin-greet">
          <h1>{first ? `Hi ${first}.` : "Your twin."}</h1>
          <p>Here is what your twin knows, who it wants to meet, and how its conversations are going.</p>
        </header>

        {me.id && <TwinOverview compact />}

        {me.id && (
          <>
            <h2 className="twin-section">Who it wants to meet</h2>
            <MatchList me={me.id} limit={5} />
          </>
        )}

        <h2 className="twin-section">Highlights</h2>
        <RecentConversations me={me.id} limit={3} />
        <p className="twin-inbox-link">
          <a className="ob-link" href="/inbox">See every conversation in your inbox</a>
        </p>
      </div>
    </main>
  );
}

function Landing() {
  return (
    <main className="wide landing">
      <Plasma />
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

      <section className="sec wrap" id="inbox">
        <h2 className="rv">Your twin&apos;s inbox.</h2>
        <p className="lead rv">It talks to other founders&apos; twins in parallel. You only hear about it when there&apos;s a decision.</p>
        <div className="rv">
          <Inbox />
        </div>
      </section>

      <section className="sec wrap" id="for">
        <span className="eyebrow rv">What it&apos;s for</span>
        <h2 className="rv">Everyone you need in year one.</h2>
        <p className="lead rv">Point your twin at a founder you already know, or let it find the right ones.</p>
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
            <p>Your texts, email, notes and calendar. Your own words beat any pitch deck.</p>
          </div>
          <div className="rv">
            <b>Never shared</b>
            <p>Other twins only hear what helps. Your runway, red lines and doubts stay with you.</p>
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
            <p className="lead">For early stage founders. Sign up, give your twin your links and a few photos, and it starts meeting the founders you have the most synergy with.</p>
            <div className="cta">
              <a className="btn white" href="/sign-up">Get your twin</a>
              <a className="btn ghost" href="/sign-in">Sign in</a>
            </div>
          </div>
        </div>
      </section>
      <div className="giant" aria-hidden>jebln</div>
    </main>
  );
}

const USES = [
  { title: "Cofounders", text: "she builds, you sell. her twin agreed to 55/45" },
  { title: "First hires", text: "engineer, your time zone, wants equity. call tuesday?" },
  { title: "Angels", text: "writes $25k pre-seed checks. free friday" },
  { title: "Design partners", text: "3 restaurant groups want a pilot" },
  { title: "Advisors", text: "scaled sales to 40 reps. open to monthly calls" },
  { title: "Other founders", text: "also raising pre-seed in london. compare notes thursday?" },
];
