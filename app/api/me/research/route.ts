import { NextResponse } from "next/server";
import { getProfile, loadFounder, saveProfile } from "../../../../lib/founders";
import { researchFounder } from "../../../../lib/research";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 180;

// One click: the twin researches its owner on the web (Orbit-style signals) and keeps what it found.
export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const id = me.id;
  const d = await researchFounder(await loadFounder(id));
  const itemId = `${id}:doc:web-research`;
  const profile = await getProfile(id);
  profile.items = profile.items.filter((x) => x.id !== itemId);
  if (d.facts.length) {
    profile.items.push({
      id: itemId,
      source: "doc",
      ts: new Date().toISOString().slice(0, 10),
      title: "What the web says about me",
      text: `${d.summary}\n${d.facts.map((f) => `- [${f.category ?? "context"}] ${f.fact} (${f.url})`).join("\n")}${d.doubts.length ? `\nDoubts: ${d.doubts.join("; ")}` : ""}`,
    });
  }
  await saveProfile(id, profile);
  return NextResponse.json({ summary: d.summary, facts: d.facts, doubts: d.doubts });
}
