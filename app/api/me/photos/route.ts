import { NextResponse } from "next/server";
import { z } from "zod";
import { ask } from "../../../../lib/claude";
import { getProfile, loadFounder, saveProfile } from "../../../../lib/founders";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  images: z.array(z.object({ name: z.string(), data: z.string(), ts: z.string() })).min(1).max(8),
});
const Captions = z.object({
  photos: z.array(z.object({ index: z.number(), caption: z.string(), skip: z.boolean() })),
});

// Gallery import. Photos are resized in the browser, captioned here by Claude, and only the captions are
// kept. The images themselves are never stored.
export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Send 1 to 8 JPEG images at a time." }, { status: 400 });
  const { images } = parsed.data;
  const founder = await loadFounder(me.id);

  const { data } = await ask({
    system: `You turn ${founder.owner.name}'s own camera roll into notes for their digital twin. For each photo write one or two factual sentences about what it shows about their life: where they are, what they are doing, work in progress (whiteboards, screens, products), routines, hobbies, places they keep returning to, family and friends described by relationship or role, never by guessing names or identities of strangers. Note visible text that reveals plans, priorities or constraints. Mark skip true for screenshots of codes, documents with financial or ID numbers, or anything with no signal about their life.`,
    messages: [
      {
        role: "user",
        content: [
          ...images.flatMap((img, i) => [
            { type: "text" as const, text: `Photo ${i} (taken ${img.ts})` },
            { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: img.data } },
          ]),
          { type: "text" as const, text: "Caption each photo by index." },
        ],
      },
    ],
    schema: Captions,
    effort: "low",
  });

  const profile = await getProfile(me.id);
  let added = 0;
  for (const p of data.photos) {
    const img = images[p.index];
    if (!img || p.skip || !p.caption.trim()) continue;
    const id = `${me.id}:photo:${img.name.replace(/[^a-z0-9]/gi, "").slice(0, 20)}-${img.ts.replace(/\D/g, "")}`;
    if (profile.items.some((i) => i.id === id)) continue;
    profile.items.push({ id, source: "photo", ts: img.ts, caption: p.caption.trim() });
    added++;
  }
  await saveProfile(me.id, profile);
  return NextResponse.json({ added, skipped: images.length - added, total: profile.items.length });
}
