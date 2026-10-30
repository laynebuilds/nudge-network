import { ask, type Turn } from "./claude";
import { renderHistory } from "./founders";
import { Predictions, Ratification, TwinTurn, type Founder, type Outcome, type SealedIntent } from "./schemas";

export function twinSystem(owner: Founder, counterpartName: string, goal: string): string {
  const name = owner.owner.name;
  return `You are the digital twin of ${name}. You negotiate on ${name}'s behalf with the twin of ${counterpartName}.

Goal set by both humans: ${goal}

Your only job is to act the way ${name} would actually want. Reaching a deal is not the goal; reaching a deal ${name} would sign is. A clean "no fit" is a good outcome when the honest answer is no.

How you work:
- Everything you know about ${name} comes from the history below. Infer their real constraints from what they said and did, not from their public bio.
- Distinguish red lines (things they said they will never do, or cannot afford) from preferences (things they want but have traded before or hinted they would trade). Hold red lines. Trade preferences for things that matter more to ${name}.
- Do not reveal private details (family, money, other people's messages) unless sharing them is clearly in ${name}'s interest. Share positions, not raw evidence. Do not open with your walk-away numbers.
- Ask the other twin questions when you need facts about their side to judge fit.
- Cite the history ids behind every position in "evidence". If the history does not answer something, put it in owner_questions instead of guessing.
- Set status "ready" only when the terms on the table satisfy every constraint of ${name}'s you can find. Set "walk_away" only when a red line cannot be met.

${name}'s history:

${renderHistory(owner)}`;
}

// One negotiation move. history is the twin's own conversation so far and is appended to in place.
export async function twinSpeak(system: string, history: Turn[], incoming: string): Promise<TwinTurn> {
  history.push({ role: "user", content: incoming });
  const { data, assistant } = await ask({ system, messages: history, schema: TwinTurn });
  history.push(assistant);
  return data;
}

// The twin checks the mediator's proposal against what it knows of its owner.
export async function twinRatify(system: string, history: Turn[], ownerName: string, outcome: Outcome, side: "a" | "b"): Promise<Ratification> {
  const { data } = await ask({
    system,
    messages: [
      ...history,
      {
        role: "user",
        content: `[Mediator] Here is the proposed outcome. You are side "${side}". Endorse it only if ${ownerName} would sign it as written. List concrete objections otherwise, with evidence ids.\n\n${JSON.stringify(outcome, null, 2)}`,
      },
    ],
    schema: Ratification,
  });
  return data;
}

// Blind prediction of the owner's sealed answers. mode "baseline" sees only the public bio,
// which is the ablation that shows whether the digital history is doing any work.
export async function predictProbes(owner: Founder, sealed: SealedIntent, mode: "twin" | "baseline"): Promise<Predictions> {
  const context =
    mode === "twin"
      ? `History:\n\n${renderHistory(owner)}`
      : `All you know is the public bio: ${owner.owner.public_bio}`;
  const { data } = await ask({
    system: `You predict how ${owner.owner.name} would answer questions about themselves. Answer as ${owner.owner.name} actually would, not as a typical founder would. Give a short concrete answer, a confidence from 0 to 1, and the history ids you relied on (empty if none).\n\n${context}`,
    messages: [
      {
        role: "user",
        content: sealed.probes.map((p) => `${p.id}: ${p.question}`).join("\n"),
      },
    ],
    schema: Predictions,
    effort: "low",
  });
  return data;
}
