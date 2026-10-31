import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getProfile, saveProfile } from "../../../../lib/founders";
import { HistoryItem } from "../../../../lib/schemas";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";

const MAX_ITEMS = 600;
const Incoming = z.array(HistoryItem.partial({ id: true, ts: true }));

// Add history items: one typed note from the app, or a batch uploaded from scripts/upload-history.mjs.
export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await req.json();
  const parsed = Incoming.safeParse(Array.isArray(body) ? body : body.items ?? [body]);
  if (!parsed.success) return NextResponse.json({ error: "Items must have a source and some text." }, { status: 400 });

  const profile = await getProfile(me.id);
  const existing = new Set(profile.items.map((i) => i.id));
  let added = 0;
  for (const raw of parsed.data) {
    if (!(raw.text ?? raw.caption)?.trim()) continue;
    const item = {
      ...raw,
      id: raw.id?.startsWith(`${me.id}:`) ? raw.id : `${me.id}:${raw.source}:${randomUUID().slice(0, 6)}`,
      ts: raw.ts ?? new Date().toISOString().slice(0, 10),
    };
    if (existing.has(item.id)) continue;
    profile.items.push(item);
    existing.add(item.id);
    added++;
  }
  if (profile.items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `A twin can hold up to ${MAX_ITEMS} items. Filter the import to the conversations that matter.` }, { status: 400 });
  }
  await saveProfile(me.id, profile);
  return NextResponse.json({ added, total: profile.items.length });
}

export async function DELETE(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  const profile = await getProfile(me.id);
  profile.items = id === "all" ? [] : profile.items.filter((i) => i.id !== id);
  await saveProfile(me.id, profile);
  return NextResponse.json({ total: profile.items.length });
}
