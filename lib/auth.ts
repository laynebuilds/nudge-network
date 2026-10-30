import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

// Invite-link auth. FOUNDER_TOKENS="layne:<secret>,jasnoor:<secret>". Each founder opens /join/<secret>
// once; the cookie then identifies them. Scripts can send the same secret as a Bearer token.
// ADMIN_FOUNDERS lists founders who may see the judges view of runs they are not part of (demo runs).
export const COOKIE = "nn_session";

function tokens(): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (process.env.FOUNDER_TOKENS ?? "").split(",")) {
    const [id, secret] = pair.split(":").map((s) => s?.trim());
    if (id && secret) map.set(secret, id);
  }
  return map;
}

export function founderForToken(token: string | undefined | null): string | null {
  if (!token) return null;
  for (const [secret, id] of tokens()) {
    const a = Buffer.from(secret);
    const b = Buffer.from(token);
    if (a.length === b.length && timingSafeEqual(a, b)) return id;
  }
  return null;
}

export async function viewer(req?: Request): Promise<string | null> {
  const bearer = req?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) return founderForToken(bearer);
  return founderForToken((await cookies()).get(COOKIE)?.value);
}

export const isAdmin = (id: string | null) =>
  !!id && (process.env.ADMIN_FOUNDERS ?? "").split(",").map((s) => s.trim()).includes(id);

// Local development without FOUNDER_TOKENS acts as an admin so the demo works out of the box.
export const authEnabled = () => !!process.env.FOUNDER_TOKENS;

export type Session = { id: string | null; admin: boolean };

// null means "not signed in" when auth is enabled.
export async function session(req?: Request): Promise<Session | null> {
  if (!authEnabled()) return { id: null, admin: true };
  const id = await viewer(req);
  return id ? { id, admin: isAdmin(id) } : null;
}
