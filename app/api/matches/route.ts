import { NextResponse } from "next/server";
import { matchesFor } from "../../../lib/match";
import { session } from "../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  return NextResponse.json({ matches: await matchesFor(me.id, refresh) });
}
