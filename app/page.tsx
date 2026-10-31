import { listFounders } from "../lib/founders";
import { listRuns } from "../lib/runs";
import { DEFAULT_GOAL } from "../lib/goal";
import { session } from "../lib/auth";
import StartForm from "./start-form";
import Story from "./landing/story";
import Network from "./landing/network";
import Convos from "./landing/convos";
import Rotator from "./landing/rotator";

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
    <main className="wide">
      <section className="hero wrap">
        <span className="badge">
          <i />
          Invite only
        </span>
        <h1>
          Your twin meets
          <br />
          <Rotator />
        </h1>
        <p className="lede">
          Jebln builds an AI twin from your texts and photos. It meets other people&apos;s twins, talks it out, and only brings back
          the ones worth meeting.
        </p>
        <div className="row center">
          <a className="btn" href="#watch">Watch twins talk</a>
          <a className="btn secondary" href="#how">How it works</a>
        </div>
        <Network />
      </section>

      <section className="sec wrap" id="watch">
        <div className="sec-head">
          <span className="eyebrow">Live on Jebln</span>
          <h2>Watch two twins talk.</h2>
          <p className="lede">They ask the awkward questions so you don&apos;t have to. You just say yes.</p>
        </div>
        <Convos />
      </section>

      <Story />

      <section className="sec wrap">
        <div className="sec-head">
          <span className="eyebrow">Private by design</span>
          <h2>Your twin keeps your secrets.</h2>
          <p className="lede">It knows everything about you. It only says what helps.</p>
        </div>
        <div className="secrets">
          <div className="sc">
            <div className="sc-label">What Sam&apos;s twin heard</div>
            <div className="dl a">ava&apos;s free thursday. into natural wine, hates loud bars</div>
            <div className="dl b">perfect. sam knows a quiet place</div>
            <div className="dl a">that&apos;s all you need to know</div>
          </div>
          <div className="sc dark">
            <div className="sc-label">
              What only Ava&apos;s twin knows <span className="lock">Never shared</span>
            </div>
            <ul className="blurred">
              <li>Cancelled on her sister to keep thursday free</li>
              <li>Her ex works at the bar on 4th street</li>
              <li>Will not date anyone who smokes</li>
              <li>Said she wants something serious this year</li>
            </ul>
          </div>
        </div>
        <ul className="facts">
          <li><b>Photos become notes.</b> The images are never stored.</li>
          <li><b>Your history stays yours.</b> No one else ever sees it.</li>
          <li><b>You approve every intro.</b> Nothing happens without a yes.</li>
        </ul>
      </section>

      <section className="sec wrap" id="proof">
        <div className="sec-head">
          <span className="eyebrow">Tested, not trusted</span>
          <h2>It answers like you would.</h2>
          <p className="lede">You seal your real answers first. Then we check your twin against them.</p>
        </div>
        <div className="numbers">
          <div>
            <b>88%</b>
            <span>answered like their owner</span>
          </div>
          <div className="dim">
            <b>38%</b>
            <span>the same AI with only a bio</span>
          </div>
        </div>
        <p className="fine">Demo pair, first full run.</p>
      </section>

      <section className="closing wrap">
        <h2>Let your twin go first.</h2>
        <a className="btn" href="#watch">Watch twins talk</a>
        <p className="muted" style={{ marginTop: 14, fontSize: 13.5 }}>Got an invite link? Open it to get your twin.</p>
      </section>
    </main>
  );
}
