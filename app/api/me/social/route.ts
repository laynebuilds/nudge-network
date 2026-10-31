import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "../../../../lib/founders";
import { webSearch } from "../../../../lib/firecrawl";
import { extractAboutOwner, linkedinPublic, renderExtract, xPublic } from "../../../../lib/social";
import { loadFounder } from "../../../../lib/founders";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const PLATFORMS = {
  linkedin: { host: "linkedin.com", label: "LinkedIn" },
  x: { host: "x.com", label: "X" },
  instagram: { host: "instagram.com", label: "Instagram" },
} as const;
type Platform = keyof typeof PLATFORMS;

const handleOf = (url: string) => new URL(url).pathname.split("/").filter(Boolean).filter((p) => p !== "in").at(0) ?? "";

// LinkedIn and X have reliable public sources (lib/social.ts). Instagram does not, so it falls back to
// public search results that point at exactly this profile; the browser bookmark covers the rest.
async function publicContent(platform: Platform, url: string): Promise<string> {
  if (platform === "linkedin") return linkedinPublic(url);
  if (platform === "x") return xPublic(url);
  const handle = handleOf(url).toLowerCase();
  const hits = await webSearch(`site:${PLATFORMS[platform].host} ${handle}`, 6).catch(() => []);
  return hits
    .filter((h) => new URL(h.url).pathname.toLowerCase().split("/").includes(handle))
    .map((h) => `${h.title}\n${h.text}`)
    .join("\n\n")
    .slice(0, 6000);
}

export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const id = me.id;
  const { platform, url, text } = (await req.json()) as { platform?: Platform; url?: string; text?: string };
  if (!platform || !(platform in PLATFORMS)) return NextResponse.json({ error: "Pick LinkedIn, X or Instagram." }, { status: 400 });
  const { host, label } = PLATFORMS[platform];
  const okHost = (u: string) => [host, ...(platform === "x" ? ["twitter.com"] : [])].some((h) => new URL(u).hostname.endsWith(h));
  if (url && !(/^https?:\/\//.test(url) && okHost(url))) {
    return NextResponse.json({ error: `Paste your full ${label} profile link.` }, { status: 400 });
  }
  const profile = await getProfile(id);
  const today = new Date().toISOString().slice(0, 10);
  const result: Record<string, number> = {};

  if (text !== undefined) {
    const itemId = `${id}:${platform}:own-words`;
    profile.items = profile.items.filter((x) => x.id !== itemId);
    if (text.trim()) profile.items.push({ id: itemId, source: platform, ts: today, title: `${label}: pasted by owner`, text: text.trim().slice(0, 12000) });
    result.pasted = text.trim().length;
  }
  if (url) {
    let raw = "";
    try {
      raw = await publicContent(platform, url);
    } catch (err) {
      result.error = 1;
      console.error(`${label} public read failed`, err);
    }
    const itemId = `${id}:${platform}:public`;
    profile.items = profile.items.filter((x) => x.id !== itemId);
    if (raw.trim()) {
      const extracted = await extractAboutOwner(await loadFounder(id), label, raw);
      if (extracted.about_owner) {
        profile.items.push({ id: itemId, source: platform, ts: today, title: `${label}: public profile (${url})`, text: renderExtract(extracted) });
        result.public = extracted.summary.length;
        result.quotes = extracted.own_words.length;
      } else {
        result.public = 0;
      }
    } else {
      result.public = 0;
    }
  }
  await saveProfile(id, profile);
  return NextResponse.json(result);
}
