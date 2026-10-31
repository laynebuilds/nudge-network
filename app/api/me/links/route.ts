import { NextResponse } from "next/server";
import { getProfile, loadFounder, saveProfile } from "../../../../lib/founders";
import { webScrape, webSearch } from "../../../../lib/firecrawl";
import { extractAboutOwner, linkedinPublic, renderExtract, xPublic } from "../../../../lib/social";
import { session } from "../../../../lib/auth";
import type { HistoryItem } from "../../../../lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

type Kind = "linkedin" | "x" | "instagram" | "doc";
const kindOf = (host: string): Kind =>
  /linkedin\.com$/.test(host) ? "linkedin" : /(^|\.)(x|twitter)\.com$/.test(host) ? "x" : /instagram\.com$/.test(host) ? "instagram" : "doc";
const LABEL: Record<Kind, string> = { linkedin: "LinkedIn", x: "X", instagram: "Instagram", doc: "website" };

async function read(kind: Kind, url: string): Promise<string> {
  if (kind === "linkedin") return linkedinPublic(url);
  if (kind === "x") return xPublic(url);
  if (kind === "instagram") {
    // Instagram blocks logged-out reads; public search still carries the bio for this exact profile.
    const handle = new URL(url).pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
    const hits = await webSearch(`site:instagram.com ${handle}`, 6);
    return hits.filter((h) => new URL(h.url).pathname.toLowerCase().split("/").includes(handle)).map((h) => `${h.title}\n${h.text}`).join("\n\n");
  }
  return (await webScrape(url)).text;
}

// One box, all your links: each is read from its most reliable public source and distilled into what it
// says about you plus your own words.
export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const id = me.id;
  const { links } = (await req.json()) as { links?: string };
  const urls = [...new Set((links ?? "").match(/https?:\/\/[^\s,]+/g) ?? [])].slice(0, 8);
  if (!urls.length) return NextResponse.json({ error: "Paste at least one full link starting with https://" }, { status: 400 });

  const founder = await loadFounder(id);
  const today = new Date().toISOString().slice(0, 10);
  const results = await Promise.all(
    urls.map(async (url) => {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const kind = kindOf(host);
      try {
        const raw = await read(kind, url);
        if (!raw.trim()) return { url, label: LABEL[kind], ok: false, note: "nothing public to read" };
        const d = await extractAboutOwner(founder, LABEL[kind], raw);
        if (!d.about_owner) return { url, label: LABEL[kind], ok: false, note: "did not look like you" };
        const item: HistoryItem = {
          id: `${id}:${kind}:link-${host.replace(/\W/g, "")}${new URL(url).pathname.replace(/\W/g, "").slice(0, 24)}`,
          source: kind,
          ts: today,
          title: `${LABEL[kind]} (${url})`,
          text: renderExtract(d),
        };
        return { url, label: LABEL[kind], ok: true, note: d.own_words.length ? `${d.own_words.length} of your posts kept` : "read", item };
      } catch {
        return { url, label: LABEL[kind], ok: false, note: "could not be read right now" };
      }
    })
  );

  const profile = await getProfile(id);
  for (const r of results) {
    if (!r.item) continue;
    profile.items = profile.items.filter((x) => x.id !== r.item!.id);
    profile.items.push(r.item);
  }
  await saveProfile(id, profile);
  return NextResponse.json({ results: results.map(({ item: _i, ...r }) => r), total: profile.items.length });
}
