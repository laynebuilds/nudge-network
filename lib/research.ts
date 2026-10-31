import { z } from "zod";
import { ask } from "./claude";
import type { Founder } from "./schemas";

// Two-step person research in the style of Orbit's contact research (jasnoorkaur111/Orbit-Personal-CRM):
// pin down the identity first, then pull 5 to 8 specific, sourced, categorised signals rather than a bio
// paraphrase. Uses Claude's server-side web search, so nothing is scraped from our own servers.
export const SIGNAL_CATEGORIES = ["professional", "recent", "interest", "personal", "mutual", "context"] as const;

const DossierSchema = z.object({
  facts: z
    .array(z.object({ fact: z.string(), category: z.enum(SIGNAL_CATEGORIES), url: z.string() }))
    .describe("5 to 8 specific signals, each with the page it came from"),
  summary: z.string().describe("One sentence, at most 20 words"),
  prebrief: z.array(z.string()).describe("3 to 4 headline bullets, 5 to 10 words each, for someone about to meet them"),
  doubts: z.array(z.string()).describe("Pages that might be a different person with the same name, or conflicting claims"),
});
export type Dossier = z.infer<typeof DossierSchema> & { facts: { fact: string; category?: string; url: string }[] };

const FICTIONAL = new Set(["maya", "jonah"]);

// Links the owner connected are the strongest identity signal (Orbit's fast path): research that person,
// never a namesake.
const knownLinks = (f: Founder) =>
  [...new Set(f.items.flatMap((i) => (i.title ?? "").match(/https?:\/\/[^\s)]+/g) ?? []))].filter((u) => !u.includes("vercel.app"));

export async function researchFounder(f: Founder, viewer?: Founder): Promise<Dossier> {
  if (FICTIONAL.has(f.owner.id)) return { facts: [], summary: "", prebrief: [], doubts: ["Demo founder: fictional, nothing public to find."] };
  const links = knownLinks(f).slice(0, 8);
  const { data } = await ask({
    system: `You research a real person for ${viewer ? `${viewer.owner.name} (${viewer.owner.public_bio}), who is about to meet them` : "their own digital twin, so it knows what the public record says about them"}. Search the web. Be fast and specific.`,
    messages: [
      {
        role: "user",
        content: `Identity:
- Name: ${f.owner.name}
- Bio: ${f.owner.public_bio}
${links.length ? `- Confirmed profiles (this is exactly who to research; ignore namesakes):\n${links.map((l) => `  - ${l}`).join("\n")}` : "- No confirmed profiles: check each page is about this person before using it."}

Prioritise LinkedIn, their own site, recent news, X, podcasts and talks.
Pull out 5 to 8 SIGNALS. Each must be specific, sourced and categorised: ${SIGNAL_CATEGORIES.join(" | ")}.
${viewer ? `"mutual" means a real overlap with ${viewer.owner.name}: shared places, schools, investors, communities, interests or problems.` : `Skip "mutual".`}

GOOD: "Raised a pre-seed from 1517 Fund after dropping out of a pre-med track (byjasnoor.com/story)" (recent)
GOOD: "Posts about Waymo glitches and SF robotaxi life" (interest)
BAD: "Is a founder" (already known)
BAD: "Has a LinkedIn profile" (useless)

Leave out personal data even when public: birth date, age, nationality, home address, family, health, follower counts.`,
      },
    ],
    schema: DossierSchema,
    effort: "low",
    webSearches: 6,
  });
  return data;
}

export function renderDossier(name: string, d: Dossier | undefined): string {
  if (!d || (!d.facts.length && !d.doubts.length)) return "";
  return `\n\nPublic research on ${name} (from the web; may be incomplete, never treat it as their private intent):${d.summary ? `\n${d.summary}` : ""}\n${d.facts
    .map((x) => `- [${x.category ?? "context"}] ${x.fact} (${x.url})`)
    .join("\n")}${d.doubts.length ? `\nDoubts: ${d.doubts.join("; ")}` : ""}`;
}
