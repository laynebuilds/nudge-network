// Run a full negotiation from the terminal and save it to runs/.
// npm run negotiate -- --a maya --b jonah --goal "..."
import { parseArgs } from "node:util";
import { createRun, executeRun, saveRun } from "../lib/runs";
import { DEFAULT_GOAL } from "../lib/goal";

const { values } = parseArgs({
  options: { a: { type: "string", default: "maya" }, b: { type: "string", default: "jonah" }, goal: { type: "string", default: DEFAULT_GOAL } },
});

const run = createRun(values.a!, values.b!, values.goal!);
console.log(`Run ${run.id}: ${run.a.name} x ${run.b.name}\nGoal: ${run.goal}\n`);

let shown = 0;
const timer = setInterval(() => {
  for (const e of run.transcript.slice(shown)) {
    console.log(`--- ${e.speaker}'s twin [${e.turn.status}] evidence: ${e.turn.evidence.join(", ") || "none"}`);
    console.log(e.turn.message + "\n");
  }
  shown = run.transcript.length;
}, 500);

await executeRun(run);
clearInterval(timer);
saveRun(run);

if (run.stage === "error") {
  console.error(`Failed: ${run.error}`);
  process.exit(1);
}
const o = run.result!.outcome;
console.log(`=== OUTCOME (${o.verdict}${run.result!.revised ? ", revised once" : ""}) ===\n${o.headline}\n`);
for (const p of o.proposal) console.log(`  ${p.term}: ${p.value}`);
console.log(`\nUnresolved:`);
for (const u of o.unresolved) console.log(`  [${u.for_owner}] ${u.question}`);
console.log(`\nRatified: a=${run.result!.ratifications.a.endorse} b=${run.result!.ratifications.b.endorse}`);

if (run.fidelity) {
  const s = run.fidelity.summary;
  console.log(`\n=== FIDELITY ===`);
  console.log(`Twin probe accuracy:     ${(s.twinAccuracy * 100).toFixed(0)}%`);
  console.log(`Bio-only baseline:       ${(s.baselineAccuracy * 100).toFixed(0)}%`);
  console.log(`Lift from history:       ${(s.lift * 100).toFixed(0)} pts`);
  console.log(`Red line violations:     ${s.redLineViolations}`);
  console.log(`Evidence grounding:      ${(s.groundingRate * 100).toFixed(0)}%`);
}
console.log(`\nSaved runs/${run.id}.json. Open http://localhost:3000/runs/${run.id} to reveal it to the founders.`);
