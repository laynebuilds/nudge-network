import { NextResponse } from "next/server";
import { createRun, listRuns } from "../../../lib/runs";
import { listFounders } from "../../../lib/founders";
import { session } from "../../../lib/auth";
import { continueInBackground, resumeStalled } from "../../../lib/autorun";

export const runtime = "nodejs";

export async function GET(req: Request) {
  resumeStalled(req);
  const me = await session(req);
  if (!me) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const runs = (await listRuns()).filter((r) => me.admin || r.a.id === me.id || r.b.id === me.id);
  return NextResponse.json({ runs: runs.map(({ id, createdAt, a, b, stage, goal }) => ({ id, createdAt, a, b, stage, goal })) });
}

export async function POST(req: Request) {
  const me = await session(req);
  if (!me) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const { a, b, goal } = (await req.json()) as { a?: string; b?: string; goal?: string };
  const founders = await listFounders();
  const ids = new Set(founders.map((f) => f.id));
  if (!a || !b || a === b || !ids.has(a) || !ids.has(b) || !goal?.trim()) {
    return NextResponse.json({ error: "Pick two different founders and a goal." }, { status: 400 });
  }
  // Founders can only send their own twin into a negotiation; anyone signed in can run the demo pair.
  const demo = new Set(founders.filter((f) => f.demo).map((f) => f.id));
  const allowed = me.admin || [a, b].every((x) => demo.has(x)) || a === me.id || b === me.id;
  if (!allowed) return NextResponse.json({ error: "You can only start negotiations that include your own twin." }, { status: 403 });
  const run = await createRun(a, b, goal.trim(), me.id);
  continueInBackground(req, run.id);
  return NextResponse.json({ id: run.id });
}
