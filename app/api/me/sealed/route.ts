import { NextResponse } from "next/server";
import { loadSealed, saveSealed } from "../../../../lib/founders";
import { SealedIntent } from "../../../../lib/schemas";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";

// Only the owner reads or writes their sealed intent. No agent, and not the other founder, ever sees it.
export async function GET(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  return NextResponse.json((await loadSealed(me.id)) ?? { owner: me.id, red_lines: [], probes: [] });
}

export async function PUT(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in with your invite link." }, { status: 401 });
  const id = me.id;
  const parsed = SealedIntent.safeParse({ ...(await req.json()), owner: id });
  if (!parsed.success) return NextResponse.json({ error: "Red lines and probes are required." }, { status: 400 });
  const clean = {
    ...parsed.data,
    red_lines: parsed.data.red_lines.map((r) => r.trim()).filter(Boolean),
    probes: parsed.data.probes
      .filter((p) => p.question.trim() && p.answer.trim())
      .map((p, i) => ({ id: `${id.slice(0, 1)}${i + 1}`, question: p.question.trim(), answer: p.answer.trim() })),
  };
  await saveSealed(id, clean);
  return NextResponse.json(clean);
}
