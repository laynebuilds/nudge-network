import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "../../../../lib/founders";
import { ABOUT_QUESTIONS, aboutItemId } from "../../../../lib/about";
import { session } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const id = me.id;
  const items = (await getProfile(id)).items;
  return NextResponse.json({
    questions: ABOUT_QUESTIONS.map((q, i) => ({ question: q, answer: items.find((x) => x.id === aboutItemId(id, i))?.text ?? "" })),
  });
}

export async function PUT(req: Request) {
  const me = await session(req);
  if (!me?.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const id = me.id;
  const { answers } = (await req.json()) as { answers?: string[] };
  if (!Array.isArray(answers)) return NextResponse.json({ error: "Send answers as a list." }, { status: 400 });
  const profile = await getProfile(id);
  const today = new Date().toISOString().slice(0, 10);
  ABOUT_QUESTIONS.forEach((q, i) => {
    const itemId = aboutItemId(id, i);
    profile.items = profile.items.filter((x) => x.id !== itemId);
    const text = answers[i]?.trim();
    if (text) profile.items.push({ id: itemId, source: "interview", ts: today, title: q, text: text.slice(0, 4000) });
  });
  await saveProfile(id, profile);
  return NextResponse.json({ saved: answers.filter((a) => a?.trim()).length });
}
