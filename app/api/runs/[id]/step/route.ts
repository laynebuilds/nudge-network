import { NextResponse } from "next/server";
import { getRun, stepRun, viewFor } from "../../../../../lib/runs";
import { session } from "../../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

// Each call advances the run by one model step. The run page calls this in a loop while it is open.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await session(req);
  if (!me) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const id = (await params).id;
  const stored = await getRun(id);
  if (!stored || (!me.admin && stored.data.a.id !== me.id && stored.data.b.id !== me.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const run = await stepRun(id);
  return NextResponse.json(viewFor(run!, me.id, me.admin));
}
