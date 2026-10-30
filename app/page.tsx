import { listFounders } from "../lib/founders";
import { listRuns } from "../lib/runs";
import { DEFAULT_GOAL } from "../lib/goal";
import StartForm from "./start-form";

export const dynamic = "force-dynamic";

export default function Home() {
  const founders = listFounders();
  const runs = listRuns();
  return (
    <>
      <section className="card">
        <h1>Introduce two twins</h1>
        <p className="muted">
          Each twin reads only its own founder&apos;s history. They negotiate, a neutral mediator writes the proposal, each twin
          checks it against its founder, and then the founders see it. A sealed intent file per founder scores whether the
          twins actually acted like them.
        </p>
        <StartForm founders={founders} defaultGoal={DEFAULT_GOAL} />
      </section>

      <section className="card">
        <h2>Past runs</h2>
        {runs.length === 0 && <p className="muted">No runs yet.</p>}
        <ul className="runs">
          {runs.map((r) => (
            <li key={r.id}>
              <a href={`/runs/${r.id}`}>
                {r.a.name} x {r.b.name}
              </a>
              <span className={`pill ${r.stage}`}>{r.stage}</span>
              {r.result && <span className="muted">{r.result.outcome.headline}</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
