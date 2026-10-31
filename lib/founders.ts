import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Founder, HistoryItem, SealedIntent } from "./schemas";
import { readJson, writeJson } from "./store";

// A founder = a committed seed (data/founders/<id>/history.json, public facts or demo data)
// plus whatever they added themselves in the app (stored privately, never in git).
export const DATA_DIR = join(process.cwd(), "data", "founders");

export type Profile = { name?: string; public_bio?: string; phone?: string; items: HistoryItem[] };
export type FounderSummary = { id: string; name: string; public_bio: string; demo: boolean; items: number; sealed: boolean };

const seedIds = () =>
  readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(DATA_DIR, d.name, "history.json")))
    .map((d) => d.name);

const DEMO = new Set(["maya", "jonah"]);

function loadSeed(id: string): Founder | null {
  const p = join(DATA_DIR, id, "history.json");
  return existsSync(p) ? Founder.parse(JSON.parse(readFileSync(p, "utf8"))) : null;
}

export async function getProfile(id: string): Promise<Profile> {
  return (await readJson<Profile>(`founders/${id}/profile.json`))?.data ?? { items: [] };
}

export async function saveProfile(id: string, profile: Profile) {
  await writeJson(`founders/${id}/profile.json`, profile);
}

export async function loadFounder(id: string): Promise<Founder> {
  const seed = loadSeed(id);
  const profile = await getProfile(id);
  if (!seed && !profile.name) throw new Error(`Unknown founder ${id}`);
  const seen = new Set<string>();
  const items = [...(seed?.items ?? []), ...profile.items.map((i) => HistoryItem.parse(i))].filter((i) =>
    seen.has(i.id) ? false : (seen.add(i.id), true)
  );
  return {
    owner: {
      id,
      name: profile.name ?? seed!.owner.name,
      public_bio: profile.public_bio ?? seed?.owner.public_bio ?? "",
    },
    items,
  };
}

// Sealed intent is only read by its owner (to edit it) and by the fidelity scorer. No agent sees it.
export async function loadSealed(id: string): Promise<SealedIntent | null> {
  const stored = await readJson<SealedIntent>(`founders/${id}/sealed.json`);
  if (stored) return SealedIntent.parse(stored.data);
  const p = join(DATA_DIR, id, "intent.sealed.json");
  return existsSync(p) ? SealedIntent.parse(JSON.parse(readFileSync(p, "utf8"))) : null;
}

export async function saveSealed(id: string, sealed: SealedIntent) {
  await writeJson(`founders/${id}/sealed.json`, SealedIntent.parse(sealed));
}

export async function listFounders(): Promise<FounderSummary[]> {
  const { registeredIds } = await import("./accounts");
  const ids = [...new Set([...seedIds(), ...(await registeredIds())])];
  return Promise.all(
    ids.map(async (id) => {
      const f = await loadFounder(id);
      return {
        id,
        name: f.owner.name,
        public_bio: f.owner.public_bio,
        demo: DEMO.has(id),
        items: f.items.length,
        sealed: !!(await loadSealed(id)),
      };
    })
  );
}

export function renderItem(i: HistoryItem): string {
  const head = [i.source, i.ts, i.with && `with ${i.with}`, i.title, i.subject].filter(Boolean).join(" | ");
  return `[${i.id}] (${head})\n${i.caption ?? i.text ?? ""}`;
}

export const renderHistory = (f: Founder) => f.items.map(renderItem).join("\n\n");
