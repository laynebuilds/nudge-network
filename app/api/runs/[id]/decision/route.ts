import { NextResponse } from "next/server";
import { getRun, saveRun } from "../../../../../lib/runs";

export const runtime = "nodejs";

// A founder's accept / reject / modify on the revealed proposal. This is also the strongest
// fidelity signal there is: did the human sign what their twin agreed to?
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const run = getRun((await params).id);
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { owner, decision, note } = (await req.json()) as { owner?: string; decision?: string; note?: string };
  if (!owner || ![run.a.id, run.b.id].includes(owner)) return NextResponse.json({ error: "Unknown founder" }, { status: 400 });
  if (decision !== "accept" && decision !== "reject" && decision !== "modify") {
    return NextResponse.json({ error: "Decision must be accept, reject or modify" }, { status: 400 });
  }
  if (decision === "modify" && !note?.trim()) return NextResponse.json({ error: "Say what you would change" }, { status: 400 });
  run.decisions[owner] = { decision, note: note?.trim() ?? "", at: new Date().toISOString() };
  saveRun(run);
  return NextResponse.json(run);
}
