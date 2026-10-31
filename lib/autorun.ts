import { after } from "next/server";

// Runs drive themselves: after a step finishes, the server calls the step endpoint again for the next one,
// so the twins negotiate to the end with nobody watching. The run lease stops double steps if a page
// is also open. We only wait long enough for the next request to start; Vercel keeps it running.
export function continueInBackground(req: Request, runId: string) {
  const secret = process.env.INTERNAL_STEP_SECRET;
  if (!secret) return;
  const url = new URL(`/api/runs/${runId}/step`, req.url);
  after(async () => {
    try {
      await fetch(url, { method: "POST", headers: { "x-nudge-internal": secret }, signal: AbortSignal.timeout(4000) });
    } catch {
      // Timeout is expected: the next step is still running on its own.
    }
  });
}

export const isInternal = (req: Request) =>
  !!process.env.INTERNAL_STEP_SECRET && req.headers.get("x-nudge-internal") === process.env.INTERNAL_STEP_SECRET;
