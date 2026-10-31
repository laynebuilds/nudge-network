import { z } from "zod";
import { ask } from "./claude";
import { webSearch } from "./firecrawl";
import type { Founder } from "./schemas";

const Dossier = z.object({
  facts: z.array(z.object({ fact: z.string(), url: z.string() })),
  doubts: z.array(z.string()).describe("Pages that may be about someone else, or claims that conflict"),
});
export type Dossier = z.infer<typeof Dossier>;

// Due diligence on a counterpart, the way a real founder would google someone before a first meeting.
// Only public pages; every fact keeps its URL so the twin can cite it.
const FICTIONAL = new Set(["maya", "jonah"]);

export async function researchFounder(f: Founder): Promise<Dossier> {
  if (FICTIONAL.has(f.owner.id)) return { facts: [], doubts: ["Demo founder: fictional, nothing public to find."] };
  const hint = f.owner.public_bio.split(/[.:(]/)[0];
  let pages: Awaited<ReturnType<typeof webSearch>> = [];
  try {
    pages = await webSearch(`"${f.owner.name}" ${hint}`, 5);
  } catch {
    return { facts: [], doubts: ["Web search was unavailable for this run."] };
  }
  if (!pages.length) return { facts: [], doubts: ["No public pages found."] };
  const { data } = await ask({
    system: `You prepare a short public dossier on ${f.owner.name} (${f.owner.public_bio}) for someone about to negotiate with them. Use only the pages given. Keep facts that matter for working together: what they build, track record, education, location, commitments, public stances. Each fact carries the URL it came from. Put pages that may be about a different person with the same name under doubts. Leave out personal data even when public: birth dates, age, nationality, home address, family, health, follower counts. At most 10 facts.`,
    messages: [{ role: "user", content: pages.map((p) => `URL: ${p.url}\nTITLE: ${p.title}\n${p.text}`).join("\n\n---\n\n") }],
    schema: Dossier,
    effort: "low",
  });
  return data;
}

export function renderDossier(name: string, d: Dossier | undefined): string {
  if (!d || (!d.facts.length && !d.doubts.length)) return "";
  return `\n\nPublic research on ${name} (from the web via Firecrawl; may be incomplete, never treat it as their private intent):\n${d.facts
    .map((x) => `- ${x.fact} [${x.url}]`)
    .join("\n")}${d.doubts.length ? `\nDoubts: ${d.doubts.join("; ")}` : ""}`;
}
