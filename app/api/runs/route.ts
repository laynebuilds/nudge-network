import { after, NextResponse } from "next/server";
import { createRun, executeRun, listRuns } from "../../../lib/runs";
import { listFounders } from "../../../lib/founders";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function GET() {
  return NextResponse.json({ runs: listRuns().map(({ id, createdAt, a, b, stage, goal }) => ({ id, createdAt, a, b, stage, goal })) });
}

export async function POST(req: Request) {
  const { a, b, goal } = (await req.json()) as { a?: string; b?: string; goal?: string };
  const ids = new Set(listFounders().map((f) => f.id));
  if (!a || !b || a === b || !ids.has(a) || !ids.has(b) || !goal?.trim()) {
    return NextResponse.json({ error: "Pick two different founders and a goal." }, { status: 400 });
  }
  const run = createRun(a, b, goal.trim());
  after(() => executeRun(run));
  return NextResponse.json({ id: run.id });
}
