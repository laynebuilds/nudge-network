import { NextResponse } from "next/server";
import { COOKIE, founderForToken } from "../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const founderId = founderForToken(token);
  if (!founderId) return new NextResponse("This invite link is not valid.", { status: 404 });
  // Signed in with Clerk too? Link that account to this twin so either way of signing in works.
  if (process.env.CLERK_SECRET_KEY) {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (userId) {
      const { linkClerk } = await import("../../../lib/accounts");
      await linkClerk(userId, founderId);
    }
  }
  const res = NextResponse.redirect(new URL("/me", req.url));
  res.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
  return res;
}
