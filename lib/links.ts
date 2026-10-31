// The profile's designated link fields. Shared by the /me form (live validation) and PUT /api/me (the same
// check on the server), so both agree on what counts as a LinkedIn, X, Instagram, GitHub or website link.
export const LINK_FIELDS = ["linkedin", "x", "instagram", "website", "github"] as const;
export type LinkField = (typeof LINK_FIELDS)[number];
export type Links = Partial<Record<LinkField, string>>;
export type LinkRead = { url: string; ok: boolean; note: string; at: string };

export const LINK_META: Record<LinkField, { label: string; hosts: string[]; placeholder: string; required?: boolean }> = {
  linkedin: { label: "LinkedIn", hosts: ["linkedin.com"], placeholder: "https://www.linkedin.com/in/your-name", required: true },
  x: { label: "X", hosts: ["x.com", "twitter.com"], placeholder: "https://x.com/your-handle" },
  instagram: { label: "Instagram", hosts: ["instagram.com"], placeholder: "https://www.instagram.com/your-handle" },
  website: { label: "Website", hosts: [], placeholder: "https://your-site.com" },
  github: { label: "GitHub", hosts: ["github.com"], placeholder: "https://github.com/your-handle" },
};

// "linkedin.com/in/me" is accepted and stored as "https://linkedin.com/in/me".
export const normalizeLink = (raw: string) => {
  const v = raw.trim();
  return !v || /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

// Returns an error message, or null when the value is empty or a valid link for that field.
export function linkError(field: LinkField, raw: string): string | null {
  const v = normalizeLink(raw);
  if (!v) return null;
  let host: string;
  try {
    host = new URL(v).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "That does not look like a link.";
  }
  const { label, hosts } = LINK_META[field];
  if (!host.includes(".")) return "That does not look like a link.";
  if (hosts.length && !hosts.some((h) => host === h || host.endsWith(`.${h}`))) return `Paste a ${label} link (${hosts[0]}/...).`;
  if (!hosts.length && Object.values(LINK_META).some((m) => m.hosts.some((h) => host === h || host.endsWith(`.${h}`)))) {
    return "Put this one in its own field above.";
  }
  return null;
}
