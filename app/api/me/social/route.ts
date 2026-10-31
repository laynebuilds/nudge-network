import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "../../../../lib/founders";
import { webScrape, webSearch } from "../../../../lib/firecrawl";
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

// What logged-out visitors can see: a direct read where the site allows it (X sometimes does), otherwise
// public search results that point at exactly this profile. Never other people with the same name.
async function publicSnippet(platform: Platform, url: string): Promise<string> {
  const handle = handleOf(url).toLowerCase();
  const parts: string[] = [];
  try {
    const page = await webScrape(url);
    if (page.text.length > 200 && !/@unknown/.test(page.text)) parts.push(page.text.slice(0, 4000));
  } catch {
    // Blocked or unsupported; fall through to search.
  }
  try {
    const hits = await webSearch(`site:${PLATFORMS[platform].host} ${handle}`, 6);
    for (const h of hits) {
      const path = new URL(h.url).pathname.toLowerCase();
      if (path.split("/").includes(handle)) parts.push(`${h.title}\n${h.text}`.slice(0, 1500));
    }
  } catch {
    // Search unavailable.
  }
  return parts.join("\n\n").slice(0, 6000);
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
    const snippet = await publicSnippet(platform, url);
    const itemId = `${id}:${platform}:public`;
    profile.items = profile.items.filter((x) => x.id !== itemId);
    if (snippet) profile.items.push({ id: itemId, source: platform, ts: today, title: `${label}: public profile (${url})`, text: snippet });
    result.public = snippet.length;
  }
  await saveProfile(id, profile);
  return NextResponse.json(result);
}
