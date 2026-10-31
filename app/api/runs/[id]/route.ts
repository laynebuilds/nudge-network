import { NextResponse } from "next/server";
import { getRun, viewFor } from "../../../../lib/runs";
import { resumeStalled } from "../../../../lib/autorun";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  resumeStalled(req);
  const me = await session(req);
  if (!me) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const stored = await getRun((await params).id);
  if (!stored) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const run = stored.data;
  if (!me.admin && run.a.id !== me.id && run.b.id !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(viewFor(run, me.id, me.admin));
}
