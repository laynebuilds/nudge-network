import { ask } from "./claude";
import { Outcome, type Founder, type Ratification, type TwinTurn } from "./schemas";
import { Twin, twinSystem } from "./twin";

export type TranscriptEntry = { side: "a" | "b"; speaker: string; turn: TwinTurn };

export type NegotiationResult = {
  transcript: TranscriptEntry[];
  outcome: Outcome;
  ratifications: { a: Ratification; b: Ratification };
  revised: boolean;
};

type Hooks = {
  onTurn?: (e: TranscriptEntry) => void | Promise<void>;
  onStage?: (stage: string) => void | Promise<void>;
};

const MAX_TURNS = Number(process.env.NUDGE_MAX_TURNS ?? 12);

export async function negotiate(a: Founder, b: Founder, goal: string, hooks: Hooks = {}): Promise<NegotiationResult> {
  const twins = {
    a: new Twin(a, twinSystem(a, b.owner.name, goal)),
    b: new Twin(b, twinSystem(b, a.owner.name, goal)),
  };
  const transcript: TranscriptEntry[] = [];
  const last: Partial<Record<"a" | "b", TwinTurn>> = {};

  await hooks.onStage?.("negotiating");
  let incoming = `[System] You speak first. Open the conversation with the twin of ${b.owner.name}.`;
  for (let i = 0; i < MAX_TURNS; i++) {
    const side = i % 2 === 0 ? "a" : "b";
    const turn = await twins[side].speak(incoming);
    const entry = { side, speaker: twins[side].owner.owner.name, turn } as TranscriptEntry;
    transcript.push(entry);
    last[side] = turn;
    await hooks.onTurn?.(entry);

    if (turn.status === "walk_away") break;
    if (last.a?.status === "ready" && last.b?.status === "ready") break;
    incoming = `[Twin of ${twins[side].owner.owner.name}] ${turn.message}${
      turn.status === "ready" ? "\n(They marked themselves ready to propose on the current terms.)" : ""
    }`;
    if (i === MAX_TURNS - 2) incoming += "\n[System] This is your final turn. Set status to ready or walk_away.";
  }

  await hooks.onStage?.("mediating");
  let outcome = await mediate(a, b, goal, transcript);

  await hooks.onStage?.("ratifying");
  let ratifications = { a: await twins.a.ratify(outcome, "a"), b: await twins.b.ratify(outcome, "b") };
  let revised = false;

  if (!ratifications.a.endorse || !ratifications.b.endorse) {
    await hooks.onStage?.("revising");
    outcome = await mediate(a, b, goal, transcript, ratifications);
    ratifications = { a: await twins.a.ratify(outcome, "a"), b: await twins.b.ratify(outcome, "b") };
    revised = true;
  }
  return { transcript, outcome, ratifications, revised };
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
