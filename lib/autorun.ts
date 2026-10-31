import { after } from "next/server";

// Runs drive themselves: after a step finishes, the server calls the step endpoint again for the next one,
// so the twins negotiate to the end with nobody watching. The run lease stops double steps if a page
// is also open. We only wait long enough for the next request to start; Vercel keeps it running.
export function continueInBackground(req: Request, runId: string) {
  const secret = process.env.INTERNAL_STEP_SECRET;
  if (!secret) return;
  const url = new URL(`/api/runs/${runId}/step`, req.url);
  after(() => kick(url, secret));
}

// Fire the next step. A timeout means it started and is running on its own; a fast failure (network,
// a deploy swapping instances, a 5xx) is retried a few times before giving up to the watchdog.
async function kick(url: URL, secret: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "x-nudge-internal": secret }, signal: AbortSignal.timeout(4000) });
      if (res.ok) return;
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") return;
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

const STALL_MS = 90_000;

// Watchdog: any unfinished run that nobody holds and that has not moved for a while gets kicked.
// Called from busy endpoints and a daily cron, so a lost hop never leaves a run stuck for long.
export function resumeStalled(req: Request) {
  const secret = process.env.INTERNAL_STEP_SECRET;
  if (!secret) return;
  after(async () => {
    const { listRuns, finished } = await import("./runs");
    const now = Date.now();
    const stalled = (await listRuns()).filter(
      (r) => !finished(r.stage) && (!r.lockUntil || r.lockUntil < now) && now - Date.parse(r.updatedAt ?? r.createdAt) > STALL_MS
    );
    await Promise.all(stalled.map((r) => kick(new URL(`/api/runs/${r.id}/step`, req.url), secret)));
    // Also pick up any iMessage replies the Photon webhook may have missed.
    const { processInbound } = await import("./photon");
    await processInbound().catch((err) => console.error("Photon inbound failed", err));
  });
}

export const isInternal = (req: Request) =>
  !!process.env.INTERNAL_STEP_SECRET && req.headers.get("x-nudge-internal") === process.env.INTERNAL_STEP_SECRET;
