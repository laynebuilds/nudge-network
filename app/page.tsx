import { listFounders } from "../lib/founders";
import { listRuns } from "../lib/runs";
import { DEFAULT_GOAL } from "../lib/goal";
import { session } from "../lib/auth";
import StartForm from "./start-form";
import Matches from "./matches";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await session();
  if (!me) {
    return (
      <section className="card">
        <h1>Nudge Network</h1>
        <p>Two people&apos;s digital twins negotiate something worth doing together, then the humans decide.</p>
        <p className="muted">This is invite only. Open the personal link you were sent to sign in.</p>
      </section>
    );
  }
  const founders = await listFounders();
  const runs = (await listRuns()).filter((r) => me.admin || r.a.id === me.id || r.b.id === me.id);
  const real = founders.filter((f) => !f.demo);
  const choices = me.admin ? founders : founders.filter((f) => f.demo || f.id === me.id || !f.demo);
  const defA = me.id ?? real[0]?.id ?? founders[0].id;
  const defB = real.find((f) => f.id !== defA)?.id ?? founders.find((f) => f.id !== defA)!.id;

  return (
    <>
      {me.id && <Matches me={me.id} />}
      <section className="card">
        <h1>Introduce two twins</h1>
        <p className="muted">
          Each twin reads only its own founder&apos;s history. They negotiate, a neutral mediator writes the proposal, each twin
          checks it against its founder, and then you both see it. Your sealed intent scores whether your twin actually acted
          like you.
        </p>
        <ul className="founders">
          {real.map((f) => (
            <li key={f.id}>
              <b>{f.name}</b> <span className="muted">{f.items} history items, {f.sealed ? "sealed intent set" : "no sealed intent yet"}</span>
            </li>
          ))}
        </ul>
        {me.id && (
          <p>
            <a href="/me">Build your twin</a> before you run: the more real history it has, the more it acts like you.
          </p>
        )}
        <StartForm founders={choices.map(({ id, name, demo }) => ({ id, name, demo }))} defaultA={defA} defaultB={defB} defaultGoal={DEFAULT_GOAL} />
      </section>

      <section className="card">
        <h2>Runs</h2>
        {runs.length === 0 && <p className="muted">No runs yet.</p>}
        <ul className="runs">
          {runs.map((r) => (
            <li key={r.id}>
              <a href={`/runs/${r.id}`}>
                {r.a.name} x {r.b.name}
              </a>
              <span className={`pill ${r.stage}`}>{r.stage}</span>
              {r.outcome && <span className="muted">{r.outcome.headline}</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
