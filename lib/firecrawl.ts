// Firecrawl gives the twins the public web. Works without a key (lower rate limits); set FIRECRAWL_API_KEY
// for production volume.
const API = "https://api.firecrawl.dev/v2";
const headers = () => ({
  "content-type": "application/json",
  ...(process.env.FIRECRAWL_API_KEY ? { authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` } : {}),
});

export type WebPage = { url: string; title: string; text: string };

export async function webSearch(query: string, limit = 5): Promise<WebPage[]> {
  const res = await fetch(`${API}/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Firecrawl search failed: ${res.status}`);
  const body = (await res.json()) as { data?: { web?: { url: string; title?: string; description?: string; markdown?: string }[] } };
  return (body.data?.web ?? []).map((r) => ({
    url: r.url,
    title: r.title ?? r.url,
    text: (r.markdown ?? r.description ?? "").slice(0, 4000),
  }));
}

export async function webScrape(url: string): Promise<WebPage> {
  const res = await fetch(`${API}/scrape`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Firecrawl scrape failed: ${res.status}`);
  const body = (await res.json()) as { data?: { markdown?: string; metadata?: { title?: string } } };
  return { url, title: body.data?.metadata?.title ?? url, text: (body.data?.markdown ?? "").slice(0, 12000) };
}
