import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Founder, SealedIntent, type HistoryItem } from "./schemas";

export const DATA_DIR = join(process.cwd(), "data", "founders");

export function listFounders(): { id: string; name: string; public_bio: string }[] {
  return readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(DATA_DIR, d.name, "history.json")))
    .map((d) => loadFounder(d.name).owner);
}

export function loadFounder(id: string): Founder {
  return Founder.parse(JSON.parse(readFileSync(join(DATA_DIR, id, "history.json"), "utf8")));
}

// Sealed intent is only ever read by the fidelity eval, never by a twin or the mediator.
export function loadSealed(id: string): SealedIntent | null {
  const p = join(DATA_DIR, id, "intent.sealed.json");
  return existsSync(p) ? SealedIntent.parse(JSON.parse(readFileSync(p, "utf8"))) : null;
}

export function renderItem(i: HistoryItem): string {
  const head = [i.source, i.ts, i.with && `with ${i.with}`, i.title, i.subject].filter(Boolean).join(" | ");
  return `[${i.id}] (${head})\n${i.caption ?? i.text ?? ""}`;
}

export const renderHistory = (f: Founder) => f.items.map(renderItem).join("\n\n");
