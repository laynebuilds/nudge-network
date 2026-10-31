import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { ask } from "../../../../lib/claude";
import { getProfile, loadFounder, saveProfile } from "../../../../lib/founders";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({ url: z.string().url(), title: z.string().max(500), text: z.string().max(80_000), images: z.array(z.string().max(1000)).max(80).optional() });
const Extract = z.object({
  about_owner: z.boolean().describe("False if this page is mostly about someone else or has nothing about the owner"),
  summary: z.string().describe("What this page says about the owner: role, history, interests, views. Plain sentences."),
  own_words: z.array(z.string()).describe("Up to 15 posts, captions or bio lines the owner wrote, verbatim"),
});

const platformOf = (host: string) =>
  /linkedin\.com$/.test(host) ? "linkedin" : /(^|\.)(x|twitter)\.com$/.test(host) ? "x" : /instagram\.com$/.test(host) ? "instagram" : "doc";

// A page captured from the owner's own logged-in browser (their LinkedIn, X or Instagram, or any page).
// Claude strips the site chrome and keeps what the page says about the owner plus their own words.
export async function POST(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Open your invite link in this browser first, then try again." }, { status: 401 });
  const id = me.id;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Nothing readable was captured from that page." }, { status: 400 });
  const { url, title, text, images } = parsed.data;
  const founder = await loadFounder(id);
  const host = new URL(url).hostname.replace(/^www\./, "");
  const platform = platformOf(host);

  const { data } = await ask({
    system: `You read a web page that ${founder.owner.name} (${founder.owner.public_bio}) opened in their own browser to teach their digital twin about themselves. Ignore navigation, ads, suggestions and other people's content. Keep what the page says about ${founder.owner.name}, and quote their own posts, captions or bio lines verbatim.`,
    messages: [{ role: "user", content: `URL: ${url}\nTITLE: ${title}\n\n${text}${images?.length ? `\n\nIMAGE DESCRIPTIONS:\n${images.join("\n")}` : ""}` }],
    schema: Extract,
    effort: "low",
  });
  if (!data.about_owner) return NextResponse.json({ error: "That page did not seem to be about you, so nothing was added." }, { status: 422 });

  const itemId = `${id}:${platform}:capture-${createHash("sha1").update(host + new URL(url).pathname).digest("hex").slice(0, 10)}`;
  const profile = await getProfile(id);
  profile.items = profile.items.filter((x) => x.id !== itemId);
  profile.items.push({
    id: itemId,
    source: platform,
    ts: new Date().toISOString().slice(0, 10),
    title: `${title.slice(0, 120)} (${url})`,
    text: `${data.summary}${data.own_words.length ? `\n\nIn their own words:\n${data.own_words.map((w) => `- "${w}"`).join("\n")}` : ""}`,
  });
  await saveProfile(id, profile);
  return NextResponse.json({ added: 1, platform, summary: data.summary, quotes: data.own_words.length, total: profile.items.length });
}
