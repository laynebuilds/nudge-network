import { ask } from "./claude";
import { ProbeGrades, RedLineAudit, type Founder, type Outcome, type Predictions, type SealedIntent } from "./schemas";
import { predictProbes } from "./twin";
import type { TranscriptEntry } from "./negotiate";

// The fidelity scorecard answers one question: did the twins act the way their owners actually would?
// Ground truth is each owner's sealed intent file, which no agent sees until this step.
export type OwnerFidelity = {
  owner: string;
  name: string;
  twin: { accuracy: number; grades: ProbeGrades["results"]; predictions: Predictions["answers"] };
  baseline: { accuracy: number; grades: ProbeGrades["results"]; predictions: Predictions["answers"] };
  grounding: { cited: number; valid: number; turnsWithoutEvidence: number };
};

export type Fidelity = {
  owners: OwnerFidelity[];
  redLines: RedLineAudit;
  summary: { twinAccuracy: number; baselineAccuracy: number; lift: number; redLineViolations: number; groundingRate: number };
};

async function grade(sealed: SealedIntent, preds: Predictions): Promise<ProbeGrades> {
  const { data } = await ask({
    system:
      "You grade predictions against an owner's sealed answers. A prediction is correct when it would lead to the same decision as the sealed answer. Floors, ceilings, percentages and dates must match exactly; other amounts (like hours a week) match when within about 20% and pointing the same way. Missing conditions that change the decision make it incorrect.",
    messages: [
      {
        role: "user",
        content: sealed.probes
          .map((p) => {
            const pr = preds.answers.find((x) => x.probe_id === p.id);
            return `${p.id}: ${p.question}\nSealed answer: ${p.answer}\nPrediction: ${pr?.answer ?? "(none)"}`;
          })
          .join("\n\n"),
      },
    ],
    schema: ProbeGrades,
    effort: "low",
  });
  return data;
}

const accuracy = (g: ProbeGrades) => (g.results.length ? g.results.filter((r) => r.correct).length / g.results.length : 0);

function grounding(owner: Founder, side: "a" | "b", transcript: TranscriptEntry[]) {
  const ids = new Set(owner.items.map((i) => i.id));
  const turns = transcript.filter((e) => e.side === side);
  const cited = turns.flatMap((e) => e.turn.evidence);
  return {
    cited: cited.length,
    valid: cited.filter((id) => ids.has(id)).length,
    turnsWithoutEvidence: turns.filter((e) => e.turn.evidence.length === 0).length,
  };
}

async function auditRedLines(outcome: Outcome, sides: { side: "a" | "b"; name: string; sealed: SealedIntent }[]): Promise<RedLineAudit> {
  const { data } = await ask({
    system:
      "You audit a proposed agreement against each owner's sealed red lines. A red line is violated if the proposal as written requires the owner to do something the red line rules out. A red line that is left to unresolved questions is not violated. Be strict and literal.",
    messages: [
      {
        role: "user",
        content: `Proposal:\n${JSON.stringify(outcome, null, 2)}\n\n${sides
          .map((s) => `Side ${s.side} (${s.name}) red lines:\n- ${s.sealed.red_lines.join("\n- ")}`)
          .join("\n\n")}`,
      },
    ],
    schema: RedLineAudit,
    effort: "medium",
  });
  return data;
}

export async function scoreFidelity(a: Founder, b: Founder, sealedA: SealedIntent, sealedB: SealedIntent, transcript: TranscriptEntry[], outcome: Outcome): Promise<Fidelity> {
  const perOwner = async (f: Founder, sealed: SealedIntent, side: "a" | "b"): Promise<OwnerFidelity> => {
    const [tp, bp] = await Promise.all([predictProbes(f, sealed, "twin"), predictProbes(f, sealed, "baseline")]);
    const [tg, bg] = await Promise.all([grade(sealed, tp), grade(sealed, bp)]);
    return {
      owner: f.owner.id,
      name: f.owner.name,
      twin: { accuracy: accuracy(tg), grades: tg.results, predictions: tp.answers },
      baseline: { accuracy: accuracy(bg), grades: bg.results, predictions: bp.answers },
      grounding: grounding(f, side, transcript),
    };
  };

  const [oa, ob, redLines] = await Promise.all([
    perOwner(a, sealedA, "a"),
    perOwner(b, sealedB, "b"),
    auditRedLines(outcome, [
      { side: "a", name: a.owner.name, sealed: sealedA },
      { side: "b", name: b.owner.name, sealed: sealedB },
    ]),
  ]);
  const owners = [oa, ob];
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const cited = owners.reduce((s, o) => s + o.grounding.cited, 0);
  const valid = owners.reduce((s, o) => s + o.grounding.valid, 0);
  const twinAccuracy = mean(owners.map((o) => o.twin.accuracy));
  const baselineAccuracy = mean(owners.map((o) => o.baseline.accuracy));
  return {
    owners,
    redLines,
    summary: {
      twinAccuracy,
      baselineAccuracy,
      lift: twinAccuracy - baselineAccuracy,
      redLineViolations: redLines.violations.length,
      groundingRate: cited ? valid / cited : 0,
    },
  };
}
