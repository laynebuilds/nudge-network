import { ask, type Turn } from "./claude";
import { Outcome, type Founder, type Ratification, type TwinTurn } from "./schemas";
import { twinRatify, twinSpeak, twinSystem } from "./twin";
import { renderDossier, researchFounder, type Dossier } from "./research";

export type TranscriptEntry = { side: "a" | "b"; speaker: string; turn: TwinTurn };

export type Stage = "researching" | "negotiating" | "mediating" | "ratifying" | "scoring" | "done" | "error";

// Everything the pipeline needs to resume from any step. Persisted between requests so each request
// does one model call (or one parallel batch) and stays well inside serverless time limits.
export type NegotiationState = {
  goal: string;
  founders: { a: Founder; b: Founder };
  stage: Stage;
  histories: { a: Turn[]; b: Turn[] };
  // dossiers.a is the public research ON founder a, which twin b reads before the meeting.
  dossiers?: { a: Dossier; b: Dossier };
  transcript: TranscriptEntry[];
  outcome?: Outcome;
  ratifications?: { a: Ratification; b: Ratification };
  revised: boolean;
};

export const MAX_TURNS = Number(process.env.NUDGE_MAX_TURNS ?? 12);

const systems = (s: NegotiationState) => ({
  a: twinSystem(s.founders.a, s.founders.b.owner.name, s.goal) + renderDossier(s.founders.b.owner.name, s.dossiers?.b),
  b: twinSystem(s.founders.b, s.founders.a.owner.name, s.goal) + renderDossier(s.founders.a.owner.name, s.dossiers?.a),
});

export function initialState(a: Founder, b: Founder, goal: string): NegotiationState {
  return { goal, founders: { a, b }, stage: "researching", histories: { a: [], b: [] }, transcript: [], revised: false };
}

// Advance one step. Returns once the state has moved forward; "scoring" is left to the caller.
export async function advance(s: NegotiationState): Promise<void> {
  if (s.stage === "researching") {
    const [da, db] = await Promise.all([researchFounder(s.founders.a), researchFounder(s.founders.b)]);
    s.dossiers = { a: da, b: db };
    s.stage = "negotiating";
    return;
  }
  const sys = systems(s);
  const { a, b } = s.founders;

  if (s.stage === "negotiating") {
    const i = s.transcript.length;
    const side = i % 2 === 0 ? "a" : "b";
    const prev = s.transcript.at(-1);
    let incoming = prev
      ? `[Twin of ${prev.speaker}] ${prev.turn.message}${prev.turn.status === "ready" ? "\n(They marked themselves ready to propose on the current terms.)" : ""}`
      : `[System] You speak first. Open the conversation with the twin of ${b.owner.name}.`;
    if (i >= MAX_TURNS - 2) incoming += "\n[System] This is your final turn. Set status to ready or walk_away.";

    const turn = await twinSpeak(sys[side], s.histories[side], incoming);
    s.transcript.push({ side, speaker: s.founders[side].owner.name, turn });

    const last = (x: "a" | "b") => s.transcript.filter((e) => e.side === x).at(-1)?.turn.status;
    if (turn.status === "walk_away" || (last("a") === "ready" && last("b") === "ready") || s.transcript.length >= MAX_TURNS) {
      s.stage = "mediating";
    }
    return;
  }

  if (s.stage === "mediating") {
    s.outcome = await mediate(a, b, s.goal, s.transcript, s.revised ? s.ratifications : undefined);
    s.stage = "ratifying";
    return;
  }

  if (s.stage === "ratifying") {
    const [ra, rb] = await Promise.all([
      twinRatify(sys.a, s.histories.a, a.owner.name, s.outcome!, "a"),
      twinRatify(sys.b, s.histories.b, b.owner.name, s.outcome!, "b"),
    ]);
    s.ratifications = { a: ra, b: rb };
    if ((!ra.endorse || !rb.endorse) && !s.revised) {
      s.revised = true;
      s.stage = "mediating";
    } else {
      s.stage = "scoring";
    }
  }
}

// The mediator never sees either history or private reasoning: only what the twins said to each other
// and the terms they declared. That keeps the proposal honest about what was actually negotiated.
async function mediate(
  a: Founder,
  b: Founder,
  goal: string,
  transcript: TranscriptEntry[],
  objections?: { a: Ratification; b: Ratification }
): Promise<Outcome> {
  const lines = transcript
    .map((e) => `${e.speaker}'s twin (${e.side}) [${e.turn.status}]: ${e.turn.message}\nDeclared terms: ${JSON.stringify(e.turn.terms)}\nOpen questions for owner: ${JSON.stringify(e.turn.owner_questions)}`)
    .join("\n\n");
  const revision = objections
    ? `\n\nYour previous draft was rejected. Objections from side a: ${JSON.stringify(objections.a.objections)}. From side b: ${JSON.stringify(objections.b.objections)}. Revise. If the objections cannot both be met, say so with verdict "partial" or "no_fit" and move the conflict into unresolved.`
    : "";
  const { data } = await ask({
    system: `You are a neutral mediator writing the outcome of a negotiation between two digital twins. Side a is ${a.owner.name}, side b is ${b.owner.name}. Goal: ${goal}

Write what the twins actually converged on. Do not invent terms neither side agreed to. Every constraint a twin declared firm must appear in constraints_respected or the verdict cannot be "agreement". Anything a twin flagged as an owner question goes in unresolved. Prefer an honest "partial" or "no_fit" over a forced agreement.`,
    messages: [{ role: "user", content: `Transcript:\n\n${lines}${revision}` }],
    schema: Outcome,
    effort: "high",
  });
  return data;
}
