import { NextResponse } from "next/server";
import { COOKIE, founderForToken } from "../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  if (!founderForToken(token)) return new NextResponse("This invite link is not valid.", { status: 404 });
  const res = NextResponse.redirect(new URL("/me", req.url));
  res.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
  return res;
}
