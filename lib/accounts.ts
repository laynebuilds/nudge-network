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
  const { saveProfile } = await import("./founders");
  const id = `${slug(name)}-${userId.slice(-6).toLowerCase()}`;
  // saveProfile also adds the new id to the registry.
  await saveProfile(id, { name, public_bio: bio, items: [] });
  await linkClerk(userId, id);
  return id;
}
