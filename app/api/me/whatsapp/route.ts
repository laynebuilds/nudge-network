import { NextResponse } from "next/server";
import { getProfile, loadFounder, saveProfile } from "../../../../lib/founders";
import { parseWhatsApp } from "../../../../lib/whatsapp";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { text, chat, myName } = (await req.json()) as { text?: string; chat?: string; myName?: string };
  if (!text?.trim()) return NextResponse.json({ error: "Upload the .txt from WhatsApp's Export chat." }, { status: 400 });
  const founder = await loadFounder(me.id);
  const items = parseWhatsApp(text, me.id, chat?.trim() || "WhatsApp chat", myName?.trim() || founder.owner.name);
  if (!items.length) return NextResponse.json({ error: "No messages found. Export the chat without media and upload the .txt." }, { status: 400 });
  const profile = await getProfile(me.id);
  const ids = new Set(items.map((i) => i.id));
  profile.items = [...profile.items.filter((i) => !ids.has(i.id)), ...items];
  await saveProfile(me.id, profile);
  return NextResponse.json({ added: items.length, total: profile.items.length });
}
