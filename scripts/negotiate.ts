// Run a full negotiation from the terminal, step by step, exactly as the web app does.
// npm run negotiate -- --a maya --b jonah --goal "..."
import { parseArgs } from "node:util";
import { createRun, finished, stepRun } from "../lib/runs";
import { DEFAULT_GOAL } from "../lib/goal";

const { values } = parseArgs({
  options: { a: { type: "string", default: "maya" }, b: { type: "string", default: "jonah" }, goal: { type: "string", default: DEFAULT_GOAL } },
});

let run = await createRun(values.a!, values.b!, values.goal!, null);
console.log(`Run ${run.id}: ${run.a.name} x ${run.b.name}\nGoal: ${run.goal}\n`);

let shown = 0;
while (!finished(run.stage)) {
  const before = run.stage;
  run = (await stepRun(run.id))!;
  for (const e of run.transcript.slice(shown)) {
    console.log(`--- ${e.speaker}'s twin [${e.turn.status}] evidence: ${e.turn.evidence.join(", ") || "none"}`);
    console.log(e.turn.message + "\n");
  }
  shown = run.transcript.length;
  if (run.stage !== before) console.log(`[stage] ${run.stage}`);
}

if (run.stage === "error") {
  console.error(`Failed: ${run.error}`);
  process.exit(1);
}
const o = run.outcome!;
console.log(`\n=== OUTCOME (${o.verdict}${run.revised ? ", revised once" : ""}) ===\n${o.headline}\n`);
for (const p of o.proposal) console.log(`  ${p.term}: ${p.value}`);
console.log(`\nUnresolved:`);
for (const u of o.unresolved) console.log(`  [${u.for_owner}] ${u.question}`);
console.log(`\nRatified: a=${run.ratifications?.a.endorse} b=${run.ratifications?.b.endorse}`);

if (run.fidelity) {
  const s = run.fidelity.summary;
  console.log(`\n=== FIDELITY ===`);
  console.log(`Twin probe accuracy:     ${(s.twinAccuracy * 100).toFixed(0)}%`);
  console.log(`Bio-only baseline:       ${(s.baselineAccuracy * 100).toFixed(0)}%`);
  console.log(`Lift from history:       ${(s.lift * 100).toFixed(0)} pts`);
  console.log(`Red line violations:     ${s.redLineViolations}`);
  console.log(`Evidence grounding:      ${(s.groundingRate * 100).toFixed(0)}%`);
}
console.log(`\nSaved. Open /runs/${run.id} to reveal it to the founders.`);
