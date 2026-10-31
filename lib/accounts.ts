import { readJson, writeJson } from "./store";

// Clerk accounts map to founder ids. Invite-link founders (seeded) can link their Clerk account by opening
// their invite link while signed in; everyone else gets a fresh founder on first sign-in.
export const REGISTRY = "founders/index.json";

export async function registeredIds(): Promise<string[]> {
  return (await readJson<string[]>(REGISTRY))?.data ?? [];
}

export async function founderForClerk(userId: string): Promise<string | null> {
  return (await readJson<{ founderId: string }>(`accounts/${userId}.json`))?.data.founderId ?? null;
}

export async function linkClerk(userId: string, founderId: string) {
  await writeJson(`accounts/${userId}.json`, { founderId, linkedAt: new Date().toISOString() });
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "founder";

export async function createFounderForClerk(userId: string, name: string, bio: string): Promise<string> {
  const { saveProfile, listFounders } = await import("./founders");
  // An invite-link founder signing up with Clerk under the same full name gets their existing twin back
  // (once: only if no other Clerk account has claimed it), instead of a second, empty one.
  const { listJson } = await import("./store");
  const claimed = new Set(
    await Promise.all((await listJson("accounts/")).map(async (p) => (await readJson<{ founderId: string }>(p))?.data.founderId))
  );
  const existing = (await listFounders()).find((f) => !f.demo && f.name.trim().toLowerCase() === name.trim().toLowerCase() && !claimed.has(f.id));
  if (existing) {
    await linkClerk(userId, existing.id);
    return existing.id;
  }
  const id = `${slug(name)}-${userId.slice(-6).toLowerCase()}`;
  // saveProfile also adds the new id to the registry.
  await saveProfile(id, { name, public_bio: bio, items: [] });
  await linkClerk(userId, id);
  return id;
}
