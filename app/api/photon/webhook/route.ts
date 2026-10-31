import { after, NextResponse } from "next/server";
import { photonEnabled, processInbound } from "../../../../lib/photon";

export const runtime = "nodejs";
export const maxDuration = 60;

// Photon calls this when something happens in the project. The body is treated only as a doorbell:
// processInbound re-reads new messages from Photon with our own key, so a forged call can at most
// make us check for messages early.
export async function POST() {
  if (!photonEnabled()) return NextResponse.json({ error: "Photon not configured" }, { status: 503 });
  after(() => processInbound().catch((err) => console.error("Photon inbound failed", err)));
  return NextResponse.json({ ok: true });
}
