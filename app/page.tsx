import { listFounders } from "../lib/founders";
import { listRuns } from "../lib/runs";
import { DEFAULT_GOAL } from "../lib/goal";
import { session } from "../lib/auth";
import StartForm from "./start-form";

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
        <span className="eyebrow">New run</span>
        <h1>Introduce two twins</h1>
        <p className="lede">
          Each twin reads only its own person&apos;s history. They negotiate, a neutral mediator writes the proposal, each twin
          checks it against its owner, and then you both see it. Your sealed intent scores whether your twin actually acted
          like you.
        </p>
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
      <div className="wrap">
        <section className="hero">
          <div>
            <span className="eyebrow">Invite only</span>
            <h1>
              Send your <em>twin</em> to the first meeting.
            </h1>
            <p className="lede">
              Nudge Network builds a digital twin from your real messages, photos and notes. It meets another person&apos;s twin,
              works out whether there is something worth doing together, and comes back with a proposal. Then the two of you
              decide.
            </p>
            <div className="row">
              <a className="btn" href="#how">See how it works</a>
              <a className="btn secondary" href="#proof">Does it really know you?</a>
            </div>
            <p className="note">Have an invite? Open the private link you were sent and you are in.</p>
          </div>
          <DemoStage />
        </section>
      </div>

      <section className="band" id="how">
        <div className="wrap">
          <span className="eyebrow">How it works</span>
          <h2>You set it up once. The twins do the talking.</h2>
          <p className="lede">
            The twins do the awkward part: surfacing red lines, trading what matters, and saying no when there is no fit. You
            get a proposal you can read in two minutes.
          </p>
          <ol className="steps">
            <li>
              <b>Build your twin</b>
              <p>Plug in WhatsApp, iMessage, Apple Mail, your camera roll and notes. Your own words beat any summary.</p>
            </li>
            <li>
              <b>Seal your intent</b>
              <p>Write down your red lines and your honest answers. No agent ever reads them. They are only used to grade.</p>
            </li>
            <li>
              <b>Twins negotiate</b>
              <p>Each twin argues for its owner and cites its evidence. A neutral mediator writes the proposal.</p>
            </li>
            <li>
              <b>You decide</b>
              <p>Accept, reject or modify. Your call is the final word, and it is stored with the run.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="band" id="proof">
        <div className="wrap split">
          <div>
            <span className="eyebrow">The scorecard</span>
            <h2>A twin is only useful if it decides like you would.</h2>
            <p className="lede">
              So every run is graded against what you sealed. Your twin predicts your answers blind, and so does the same model
              given only your public bio. The gap is what your history is worth.
            </p>
            <ul className="checks">
              <li>
                <div>
                  <b>Probe accuracy</b>
                  <span>Does your twin answer your sealed questions the way you did?</span>
                </div>
              </li>
              <li>
                <div>
                  <b>Red line audit</b>
                  <span>A deal that gives away something you never would is a failure, even if both sides signed.</span>
                </div>
              </li>
              <li>
                <div>
                  <b>Grounding</b>
                  <span>Every move must cite real items from your history, and the scorer checks that they exist.</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <div className="bignums">
              <div className="hl">
                <b>88%</b>
                <span>twin probe accuracy</span>
              </div>
              <div>
                <b>38%</b>
                <span>same model, bio only</span>
              </div>
              <div>
                <b>0</b>
                <span>red line violations</span>
              </div>
              <div>
                <b>100%</b>
                <span>citations that resolve</span>
              </div>
            </div>
            <p className="fine">
              First full run of the demo pair, two fictional London founders. A clean &ldquo;no fit&rdquo; counts as a success
              when it is the honest answer.
            </p>
          </div>
        </div>
      </section>

      <section className="band" id="privacy">
        <div className="wrap">
          <div className="seal">sealed</div>
          <span className="eyebrow">Privacy</span>
          <h2>Your history stays yours.</h2>
          <p className="lede">
            The other person never sees your history. Their twin only hears what yours chooses to say, the same way a good
            friend would represent you.
          </p>
          <ul className="grid3">
            <li>
              <b>Photos become notes</b>
              <p>Images are resized in your browser, described in a sentence or two, and never stored.</p>
            </li>
            <li>
              <b>Sealed means sealed</b>
              <p>Your red lines and answers are seen by you and the scorer. No agent and no other person reads them.</p>
            </li>
            <li>
              <b>Reasoning stays private</b>
              <p>Until you have both decided, each of you sees only your own twin&apos;s thinking and scorecard.</p>
            </li>
            <li>
              <b>Your Mac reads locally</b>
              <p>iMessage and Mail are read on your machine by Nudge. You review the file and upload only what you keep.</p>
            </li>
            <li>
              <b>Never in git</b>
              <p>Real histories live in a private store, separate from the code and the public demo data.</p>
            </li>
            <li>
              <b>You have the last word</b>
              <p>Nothing is agreed on your behalf. The twins propose; the humans accept, reject or modify.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <h2>Let the twins have the first conversation.</h2>
          <p className="lede">Nudge Network is invite only while we test it with real pairs. Open your personal link to build your twin.</p>
          <a className="btn" href="#how">How it works</a>
        </div>
      </section>
    </main>
  );
}

// A static excerpt in the shape of a real run, drawn from the demo pair's history ids.
function DemoStage() {
  return (
    <div className="stage" aria-label="Example negotiation between two twins">
      <div className="stage-head">
        <span>
          <span className="who-dot" style={{ ["--c" as string]: "var(--a)" }}>Maya&apos;s twin</span>
          <span className="muted"> and </span>
          <span className="who-dot" style={{ ["--c" as string]: "var(--b)" }}>Jonah&apos;s twin</span>
        </span>
        <span className="pill on">negotiating</span>
      </div>
      <div className="msg a">
        <div className="meta">
          Maya&apos;s twin <span className="cite">maya:email:1</span>
        </div>
        <div className="body">Rails stay fiat. Maya will not build on stablecoins, now or later. That is not up for trade.</div>
      </div>
      <div className="msg b">
        <div className="meta">
          <span className="cite">jonah:note:2</span> Jonah&apos;s twin
        </div>
        <div className="body">Fine by Jonah. He needs to be CEO and in the room with customers every week. Is Maya open to CTO?</div>
      </div>
      <div className="msg a">
        <div className="meta">
          Maya&apos;s twin <span className="cite">maya:note:2</span>
        </div>
        <div className="body">Yes, she wants to build, not run the board. But she needs you full time by mid January.</div>
      </div>
      <div className="verdict-card">
        <span className="pill verdict agreement">agreement</span>
        <table className="terms">
          <tbody>
            <tr><th>Roles</th><td>Jonah CEO, Maya CTO</td></tr>
            <tr><th>Equity</th><td>Maya 55, Jonah 45</td></tr>
            <tr><th>Rails</th><td>Fiat only</td></tr>
            <tr><th>Start</th><td>15 January</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
