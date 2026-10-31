import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "../../../../lib/founders";
import { webScrape } from "../../../../lib/firecrawl";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

// Add a public page you wrote or that is about you (personal site, product page, blog post) via Firecrawl.
export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { url } = (await req.json()) as { url?: string };
  if (!url || !/^https?:\/\//.test(url)) return NextResponse.json({ error: "Paste a full link starting with https://" }, { status: 400 });
  let page;
  try {
    page = await webScrape(url);
  } catch {
    return NextResponse.json({ error: "Could not read that page." }, { status: 502 });
  }
  if (!page.text.trim()) return NextResponse.json({ error: "That page had no readable text." }, { status: 422 });
  const profile = await getProfile(me.id);
  const id = `${me.id}:doc:web-${new URL(url).hostname.replace(/\W/g, "")}${new URL(url).pathname.replace(/\W/g, "").slice(0, 20)}`;
  profile.items = profile.items.filter((i) => i.id !== id);
  profile.items.push({ id, source: "doc", ts: new Date().toISOString().slice(0, 10), title: `${page.title} (${url})`, text: page.text });
  await saveProfile(me.id, profile);
  return NextResponse.json({ added: 1, title: page.title, total: profile.items.length });
}
