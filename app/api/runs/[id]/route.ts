import { NextResponse } from "next/server";
import { getRun } from "../../../../lib/runs";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const run = getRun((await params).id);
  return run ? NextResponse.json(run) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
