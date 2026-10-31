import { NextResponse } from "next/server";
import { getProfile, loadFounder, saveProfile } from "../../../lib/founders";
import { session } from "../../../lib/auth";
import { resumeStalled } from "../../../lib/autorun";

export const runtime = "nodejs";

export async function GET(req: Request) {
  resumeStalled(req);
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const [founder, profile] = await Promise.all([loadFounder(me.id), getProfile(me.id)]);
  const own = new Set(profile.items.map((i) => i.id));
  return NextResponse.json({ founder, editable: [...own], phone: profile.phone ?? "" });
}

export async function PUT(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const { name, public_bio, phone } = (await req.json()) as { name?: string; public_bio?: string; phone?: string };
  const profile = await getProfile(me.id);
  if (name?.trim()) profile.name = name.trim().slice(0, 80);
  if (public_bio !== undefined) profile.public_bio = public_bio.trim().slice(0, 500);
  if (phone !== undefined) profile.phone = phone.replace(/[^\d+]/g, "").slice(0, 20) || undefined;
  await saveProfile(me.id, profile);
  return NextResponse.json({ ok: true });
}
