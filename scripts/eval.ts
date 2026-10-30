// Probe-only fidelity eval, no negotiation. Measures how well each twin predicts its owner's sealed
// answers versus a bio-only baseline. Cheap enough to run after every prompt or data change.
// npm run eval -- --owners maya,jonah --repeats 3
import { parseArgs } from "node:util";
import { listFounders, loadFounder, loadSealed } from "../lib/founders";
import { predictProbes } from "../lib/twin";
import { ask } from "../lib/claude";
import { ProbeGrades, type SealedIntent, type Predictions } from "../lib/schemas";

const { values } = parseArgs({
  options: { owners: { type: "string" }, repeats: { type: "string", default: "1" } },
});
const owners = values.owners?.split(",") ?? (await listFounders()).map((f) => f.id);
const repeats = Number(values.repeats);

async function grade(sealed: SealedIntent, preds: Predictions) {
  const { data } = await ask({
    system:
      "You grade predictions against an owner's sealed answers. A prediction is correct when it would lead to the same decision as the sealed answer. Numbers and dates must match exactly. Missing conditions that change the decision make it incorrect.",
    messages: [
      {
        role: "user",
        content: sealed.probes
          .map((p) => `${p.id}: ${p.question}\nSealed answer: ${p.answer}\nPrediction: ${preds.answers.find((x) => x.probe_id === p.id)?.answer ?? "(none)"}`)
          .join("\n\n"),
      },
    ],
    schema: ProbeGrades,
    effort: "low",
  });
  return data.results;
}

for (const id of owners) {
  const sealed = await loadSealed(id);
  if (!sealed) {
    console.log(`${id}: no intent.sealed.json, skipping`);
    continue;
  }
  const f = await loadFounder(id);
  const score = { twin: 0, baseline: 0, n: 0 };
  const misses = new Map<string, number>();
  for (let r = 0; r < repeats; r++) {
    for (const mode of ["twin", "baseline"] as const) {
      const results = await grade(sealed, await predictProbes(f, sealed, mode));
      score[mode] += results.filter((x) => x.correct).length;
      if (mode === "twin") for (const x of results) if (!x.correct) misses.set(x.probe_id, (misses.get(x.probe_id) ?? 0) + 1);
    }
    score.n += sealed.probes.length;
  }
  const pct = (x: number) => `${((x / score.n) * 100).toFixed(0)}%`;
  console.log(`${f.owner.name}: twin ${pct(score.twin)}  baseline ${pct(score.baseline)}  (${score.n} probe answers)`);
  for (const [pid, n] of misses) console.log(`  twin missed ${pid} ${n}/${repeats}: ${sealed.probes.find((p) => p.id === pid)?.question}`);
}
