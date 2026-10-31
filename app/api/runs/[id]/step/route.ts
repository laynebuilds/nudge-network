import { NextResponse } from "next/server";
import { finished, getRun, stepRun, viewFor } from "../../../../../lib/runs";
import { session } from "../../../../../lib/auth";
import { continueInBackground, isInternal } from "../../../../../lib/autorun";

export const runtime = "nodejs";
export const maxDuration = 300;

// Each call advances the run by one model step, then schedules the next step on the server.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const internal = isInternal(req);
  const me = internal ? { id: null, admin: true } : await session(req);
  if (!me) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const id = (await params).id;
  const stored = await getRun(id);
  if (!stored || (!me.admin && stored.data.a.id !== me.id && stored.data.b.id !== me.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const before = stored.data.stage;
  const run = (await stepRun(id))!;
  // Only the call that did the work schedules the next step. A call that found the run locked does
  // nothing more: the lock holder chains when it finishes, so there is exactly one chain per run.
  const progressed = run.stage !== before || run.transcript.length !== stored.data.transcript.length;
  if (!finished(run.stage) && progressed) continueInBackground(req, id);
  return NextResponse.json(internal ? { stage: run.stage } : viewFor(run, me.id, me.admin));
}
