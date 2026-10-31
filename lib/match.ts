import { z } from "zod";
import { ask } from "./claude";
import { listFounders, loadFounder, renderHistory } from "./founders";
import { readJson, writeJson } from "./store";
import type { Founder } from "./schemas";

// Marketplace matchmaking: before any twin negotiates, rank everyone else on the network by synergy with
// this person, so twins go to the most promising people first.
const Ranking = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      score: z.number().describe("0 to 100: how likely a conversation between these two produces something valuable"),
      why: z.string().describe("One line: the specific overlap or complement"),
      goal: z.string().describe("The goal their twins should explore, in one sentence"),
    })
  ),
});
export type Match = z.infer<typeof Ranking>["matches"][number] & { name: string; demo: boolean };

const brief = (f: Founder) => `### ${f.owner.id}: ${f.owner.name}\n${f.owner.public_bio}\n${renderHistory(f).slice(0, 5000)}`;
const TTL_MS = 30 * 60 * 1000;

export async function matchesFor(id: string, refresh = false): Promise<Match[]> {
  const cached = await readJson<{ at: number; matches: Match[] }>(`matches/${id}.json`);
  if (!refresh && cached && Date.now() - cached.data.at < TTL_MS) return cached.data.matches;

  const everyone = await listFounders();
  const others = everyone.filter((f) => f.id !== id);
  const [me, ...theirs] = await Promise.all([loadFounder(id), ...others.map((f) => loadFounder(f.id))]);
  const { data } = await ask({
    system: `You are the matchmaker of a network where people's digital twins negotiate on their behalf. Rank who ${me.owner.name} should talk to first. Synergy means a concrete reason to work together: complementary skills, overlapping missions, a customer or investor fit, a problem one can solve for the other. Shared vibes are not enough. Be honest: low scores are fine.`,
    messages: [
      {
        role: "user",
        content: `The person:\n${brief(me)}\n\nThe network (score every id):\n\n${theirs.map(brief).join("\n\n")}`,
      },
    ],
    schema: Ranking,
    effort: "low",
  });
  const byId = new Map(others.map((f) => [f.id, f]));
  const matches = data.matches
    .filter((m) => byId.has(m.id))
    .map((m) => ({ ...m, name: byId.get(m.id)!.name, demo: byId.get(m.id)!.demo }))
    .sort((a, b) => b.score - a.score);
  await writeJson(`matches/${id}.json`, { at: Date.now(), matches });
  return matches;
}
