import { NextResponse } from "next/server";
import { getProfile, loadFounder, saveProfile } from "../../../lib/founders";
import { LINK_FIELDS, linkError, normalizeLink } from "../../../lib/links";
import { session } from "../../../lib/auth";
import { resumeStalled } from "../../../lib/autorun";

export const runtime = "nodejs";

export async function GET(req: Request) {
  resumeStalled(req);
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const [founder, profile] = await Promise.all([loadFounder(me.id), getProfile(me.id)]);
  const own = new Set(profile.items.map((i) => i.id));
  return NextResponse.json({
    founder,
    editable: [...own],
    phone: profile.phone ?? "",
    links: profile.links ?? {},
    links_read: profile.links_read ?? {},
  });
}

// Partial update: only the fields present in the body change. The /me form autosaves just what was edited.
export async function PUT(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    public_bio?: string;
    phone?: string;
    links?: Record<string, string>;
  } | null;
  if (!body) return NextResponse.json({ error: "Send the profile as JSON." }, { status: 400 });
  const { name, public_bio, phone, links } = body;
  for (const [field, value] of Object.entries(links ?? {})) {
    if (!(LINK_FIELDS as readonly string[]).includes(field)) return NextResponse.json({ error: `Unknown link field ${field}.` }, { status: 400 });
    const err = typeof value === "string" ? linkError(field as (typeof LINK_FIELDS)[number], value) : "Links must be text.";
    if (err) return NextResponse.json({ error: err, field }, { status: 400 });
  }
  const profile = await getProfile(me.id);
  if (name?.trim()) profile.name = name.trim().slice(0, 80);
  if (public_bio !== undefined) profile.public_bio = public_bio.trim().slice(0, 500);
  if (phone !== undefined) profile.phone = phone.replace(/[^\d+]/g, "").slice(0, 20) || undefined;
  if (links) {
    profile.links = { ...profile.links };
    for (const field of LINK_FIELDS) {
      if (links[field] === undefined) continue;
      const v = normalizeLink(links[field]).slice(0, 300);
      if (v) profile.links[field] = v;
      else delete profile.links[field];
    }
  }
  await saveProfile(me.id, profile);
  return NextResponse.json({ ok: true, links: profile.links ?? {} });
}
