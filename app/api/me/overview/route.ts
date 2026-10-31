import { NextResponse } from "next/server";
import { z } from "zod";
import { ask } from "../../../../lib/claude";
import { loadFounder, renderHistory } from "../../../../lib/founders";
import { readJson, writeJson } from "../../../../lib/store";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

// The twin's picture of its owner, for the home dashboard: how it would describe you, the few facts it leans
// on, and where each one came from. One model call, cached for half an hour like the matches.
const SOURCES = ["bio", "imessage", "email", "calendar", "note", "photo", "doc", "whatsapp", "linkedin", "x", "instagram", "interview"] as const;
const Overview = z.object({
  summary: z.string().describe("2 to 3 sentences, second person, how the twin would describe its owner to another founder"),
  rows: z
    .array(
      z.object({
        label: z.string().describe("Short label, e.g. Building, Looking for, Location, Background"),
        value: z.string().describe("One short line"),
        source: z.enum(SOURCES).describe("Where this mostly comes from: bio, or the source of the history items behind it"),
      })
    )
    .describe("3 to 6 rows, only facts the history supports"),
});
type TwinOverviewData = z.infer<typeof Overview> & { sources: string[] };

const TTL_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const key = `overview/${me.id}.json`;
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const cached = await readJson<{ at: number; overview: TwinOverviewData }>(key);
  if (!refresh && cached && Date.now() - cached.data.at < TTL_MS) return NextResponse.json(cached.data.overview);

  const f = await loadFounder(me.id);
  const sources = [...new Set(f.items.map((i) => i.source))];
  // Nothing to read yet: say so instead of asking the model to invent someone.
  if (!f.owner.public_bio.trim() && f.items.length === 0) {
    return NextResponse.json({ summary: "", rows: [], sources } satisfies TwinOverviewData);
  }
  try {
    const { data } = await ask({
      system: `You are ${f.owner.name}'s digital twin. Describe your owner back to them, plainly and specifically, using only what their bio and history support. Never guess at private details like money, health or relationships. Keep every value short.`,
      messages: [{ role: "user", content: `Bio: ${f.owner.public_bio || "(none)"}\n\nHistory:\n${renderHistory(f).slice(0, 20000) || "(none)"}` }],
      schema: Overview,
      effort: "low",
    });
    const overview: TwinOverviewData = { ...data, sources };
    await writeJson(key, { at: Date.now(), overview });
    return NextResponse.json(overview);
  } catch (err) {
    console.error("Overview failed", err);
    if (cached) return NextResponse.json(cached.data.overview);
    return NextResponse.json({ error: "Your twin could not describe you just now. Try again." }, { status: 502 });
  }
}
