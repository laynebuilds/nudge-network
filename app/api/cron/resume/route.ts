import { NextResponse } from "next/server";
import { resumeStalled } from "../../../../lib/autorun";

export const runtime = "nodejs";

// Daily backstop for the watchdog (Vercel Hobby allows daily crons).
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  resumeStalled(req);
  return NextResponse.json({ ok: true });
}
