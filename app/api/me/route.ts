import { NextResponse } from "next/server";
import { getProfile, loadFounder, saveProfile } from "../../../lib/founders";
import { session } from "../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const [founder, profile] = await Promise.all([loadFounder(me.id), getProfile(me.id)]);
  const own = new Set(profile.items.map((i) => i.id));
  return NextResponse.json({ founder, editable: [...own] });
}

export async function PUT(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const { name, public_bio } = (await req.json()) as { name?: string; public_bio?: string };
  const profile = await getProfile(me.id);
  if (name?.trim()) profile.name = name.trim().slice(0, 80);
  if (public_bio !== undefined) profile.public_bio = public_bio.trim().slice(0, 500);
  await saveProfile(me.id, profile);
  return NextResponse.json({ ok: true });
}
