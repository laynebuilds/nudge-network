import { after, NextResponse } from "next/server";
import { getRun, saveRun, viewFor } from "../../../../../lib/runs";
import { session } from "../../../../../lib/auth";

export const runtime = "nodejs";

// A founder's accept / reject / modify on the revealed proposal. This is also the strongest
// fidelity signal there is: did the human sign what their twin agreed to?
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await session(req);
  if (!me) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const stored = await getRun((await params).id);
  if (!stored) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const run = stored.data;
  if (run.stage !== "done") return NextResponse.json({ error: "Wait until the twins have finished." }, { status: 409 });
  const { owner: asked, decision, note } = (await req.json()) as { owner?: string; decision?: string; note?: string };
  // Signed-in founders decide for themselves. Without auth (local demo) the body names the founder.
  const owner = me.id ?? asked;
  if (!owner || ![run.a.id, run.b.id].includes(owner)) return NextResponse.json({ error: "Only the two founders can decide." }, { status: 403 });
  if (decision !== "accept" && decision !== "reject" && decision !== "modify") {
    return NextResponse.json({ error: "Decision must be accept, reject or modify" }, { status: 400 });
  }
  if (decision === "modify" && !note?.trim()) return NextResponse.json({ error: "Say what you would change" }, { status: 400 });
  run.decisions[owner] = { decision, note: note?.trim() ?? "", at: new Date().toISOString() };
  await saveRun(run);
  // The second decision closes the loop over iMessage for both founders.
  const other = run.a.id === owner ? run.b : run.a;
  if (run.decisions[other.id]) {
    after(async () => {
      const { announceBoth, photonEnabled } = await import("../../../../../lib/photon");
      if (photonEnabled()) await announceBoth(run).catch((err) => console.error("Photon announce failed", err));
    });
  }
  return NextResponse.json(viewFor(run, me.id ?? owner, me.admin));
}
