import { z } from "zod";
import { ask } from "./claude";
import type { Founder } from "./schemas";

// Reliable public sources per platform (tested 2026-10-31):
// - LinkedIn serves the full public profile, including recent posts as JSON-LD, to link-preview crawlers.
// - X: FxTwitter's public API returns the bio and recent posts and replies, no key.
// - Instagram blocks logged-out reads; the owner uses the browser bookmark or their data export instead.
const PREVIEW_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

const stripHtml = (html: string) =>
  html
    .replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");

export async function linkedinPublic(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": PREVIEW_UA, "accept-language": "en" }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`LinkedIn returned ${res.status}`);
  const html = await res.text();
  const jsonLd = [...html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
  return `${jsonLd.slice(0, 25_000)}\n\n${stripHtml(html).slice(0, 25_000)}`;
}

type FxStatus = { text: string; created_at: string; replying_to?: { screen_name: string } | null };

export async function xPublic(url: string): Promise<string> {
  const handle = new URL(url).pathname.split("/").filter(Boolean)[0];
  if (!handle) throw new Error("No handle in that X link");
  const get = async (path: string) => {
    const res = await fetch(`https://api.fxtwitter.com${path}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`X lookup returned ${res.status}`);
    return res.json();
  };
  const profile = (await get(`/${handle}`)).user ?? {};
  const posts: FxStatus[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 4 && posts.length < 80; i++) {
    const page = await get(`/2/profile/${handle}/statuses?with_replies=true${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    posts.push(...(page.results ?? []));
    cursor = page.cursor?.bottom;
    if (!cursor) break;
  }
  return [
    `@${handle}: ${profile.name ?? ""}. Bio: ${profile.description ?? ""}. Location: ${profile.location ?? ""}. ${profile.followers ?? "?"} followers.`,
    ...posts.map((p) => `[${p.created_at}] ${p.replying_to ? `reply to @${p.replying_to.screen_name}: ` : ""}${p.text}`),
  ].join("\n");
}

export const Extract = z.object({
  about_owner: z.boolean().describe("False if the content is mostly about someone else or says nothing about the owner"),
  summary: z.string().describe("What this says about the owner: role, history, interests, views, how they spend their time. Plain sentences."),
  own_words: z.array(z.string()).describe("Up to 15 posts, captions or bio lines the owner wrote, verbatim"),
});

// Strip site chrome and keep what the content says about the owner, plus their own words verbatim.
export async function extractAboutOwner(owner: Founder, source: string, raw: string) {
  const { data } = await ask({
    system: `You read content from ${owner.owner.name}'s own ${source} (${owner.owner.public_bio}) to teach their digital twin about them. Ignore navigation, ads, suggestions and other people's content. Keep what it says about ${owner.owner.name}, and quote their own posts, captions or bio lines verbatim.`,
    messages: [{ role: "user", content: raw }],
    schema: Extract,
    effort: "low",
  });
  return data;
}

export const renderExtract = (d: z.infer<typeof Extract>) =>
  `${d.summary}${d.own_words.length ? `\n\nIn their own words:\n${d.own_words.map((w) => `- "${w}"`).join("\n")}` : ""}`;
