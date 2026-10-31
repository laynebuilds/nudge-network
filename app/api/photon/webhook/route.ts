import { after } from "next/server";
import { listFounders, getProfile } from "../../../../lib/founders";
import { listRuns, saveRun, getRun } from "../../../../lib/runs";
import { normalizePhone, parseDecision, photonEnabled, publicUrl, spectrum } from "../../../../lib/photon";

export const runtime = "nodejs";
export const maxDuration = 60;

// Inbound iMessages from founders. A reply to an opportunity text records their decision on the latest
// finished run they have not decided yet. The SDK verifies the Photon signature.
export async function POST(req: Request) {
  if (!photonEnabled()) return new Response("Photon not configured", { status: 503 });
  const app = await spectrum();
  const work: Promise<void>[] = [];
  const res = await app.webhook(req, (space, message) => {
    const task = (async () => {
      if (message.direction !== "inbound" || message.content.type !== "text" || !message.sender) return;
      const from = normalizePhone(message.sender.id);
      const founders = await listFounders();
      let ownerId: string | null = null;
      for (const f of founders) {
        const phone = (await getProfile(f.id)).phone;
        if (phone && normalizePhone(phone) === from) ownerId = f.id;
      }
      if (!ownerId) return;
      const parsed = parseDecision(message.content.text);
      const run = (await listRuns()).find((r) => r.stage === "done" && (r.a.id === ownerId || r.b.id === ownerId) && !r.decisions[ownerId!]);
      if (!run) {
        await space.send(`Nothing is waiting for your decision right now. Your runs: ${publicUrl()}`);
        return;
      }
      if (!parsed) {
        await space.send("Reply ACCEPT, REJECT, or MODIFY followed by what you would change.");
        return;
      }
      if (parsed.decision === "modify" && !parsed.note) {
        await space.send("What would you change? Reply MODIFY followed by the change.");
        return;
      }
      const fresh = (await getRun(run.id))!.data;
      fresh.decisions[ownerId] = { decision: parsed.decision, note: parsed.note, at: new Date().toISOString() };
      await saveRun(fresh);
      const other = fresh.a.id === ownerId ? fresh.b : fresh.a;
      const both = !!fresh.decisions[other.id];
      await space.send(
        `Got it: ${parsed.decision}${parsed.note ? ` (${parsed.note})` : ""}. ${
          both ? `${other.name} has decided too, so the full run is open: ${publicUrl()}/runs/${fresh.id}` : `We will tell you when ${other.name} decides.`
        }`
      );
    })();
    work.push(task);
  });
  // The SDK dispatches the handler after building the response; keep the function alive until it finishes.
  after(async () => {
    await new Promise((r) => setTimeout(r, 0));
    await Promise.allSettled(work);
  });
  return res;
}
