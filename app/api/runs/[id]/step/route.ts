import { NextResponse } from "next/server";
import { finished, getRun, stepRun, viewFor } from "../../../../../lib/runs";
import { session } from "../../../../../lib/auth";
import { continueInBackground, isInternal } from "../../../../../lib/autorun";

export const runtime = "nodejs";
export const maxDuration = 300;
const BUDGET_MS = 150_000;

// Advances the run, then schedules the next round on the server.
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
  const beforeTurns = stored.data.transcript.length;
  // Vercel stops a function that keeps re-invoking itself after a few hops, so a background call does as
  // many steps as fit in its time budget before handing off. A user's call does just one.
  const started = Date.now();
  let run = (await stepRun(id))!;
  while (internal && !finished(run.stage) && Date.now() - started < BUDGET_MS && !(run.lockUntil && run.lockUntil > Date.now())) {
    const turns = run.transcript.length;
    const stage = run.stage;
    run = (await stepRun(id))!;
    if (run.stage === stage && run.transcript.length === turns) break;
  }
  // Only the call that did the work schedules the next round; a call that found the run locked does nothing.
  const progressed = run.stage !== before || run.transcript.length !== beforeTurns;
  if (!finished(run.stage) && progressed) continueInBackground(req, id);
  return NextResponse.json(internal ? { stage: run.stage } : viewFor(run, me.id, me.admin));
}
