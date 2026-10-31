import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { getProfile } from "./founders";
import type { Run } from "./runs";

// Photon (spectrum-ts) puts the twins on iMessage. When a negotiation ends in an opportunity, each founder
// gets a text with the headline and a link, and can decide by replying. Off unless the project is configured.
export const photonEnabled = () => !!(process.env.SPECTRUM_PROJECT_ID && process.env.SPECTRUM_PROJECT_SECRET);
export const publicUrl = () => process.env.PUBLIC_URL ?? "https://nudge-network.vercel.app";

export async function spectrum() {
  return Spectrum({
    projectId: process.env.SPECTRUM_PROJECT_ID!,
    projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
    providers: [imessage.config()],
    webhookSecret: process.env.SPECTRUM_WEBHOOK_SECRET,
  });
}

export const normalizePhone = (p: string) => p.replace(/[^\d+]/g, "");

export async function sendText(phone: string, text: string) {
  const app = await spectrum();
  const im = imessage(app);
  const dm = await im.space.create(await im.user(normalizePhone(phone)));
  await dm.send(text);
}

// Only a real opportunity is worth interrupting someone for.
export async function notifyOpportunity(run: Run): Promise<string[]> {
  if (!photonEnabled() || !run.outcome || run.outcome.verdict === "no_fit") return [];
  const sent: string[] = [];
  for (const [me, other] of [
    [run.a, run.b],
    [run.b, run.a],
  ] as const) {
    const phone = (await getProfile(me.id)).phone;
    if (!phone) continue;
    const open = run.outcome.unresolved.filter((u) => u.for_owner === "both" || u.for_owner === (me.id === run.a.id ? "a" : "b"));
    await sendText(
      phone,
      [
        `Your twin met ${other.name}'s twin and found an opportunity.`,
        "",
        run.outcome.headline,
        open.length ? `\nNeeds you: ${open[0].question}${open.length > 1 ? ` (+${open.length - 1} more)` : ""}` : "",
        "",
        `Read it: ${publicUrl()}/runs/${run.id}`,
        "Reply ACCEPT, REJECT, or MODIFY followed by what you would change.",
      ]
        .filter((l) => l !== "")
        .join("\n")
    );
    sent.push(me.id);
  }
  return sent;
}

export function parseDecision(text: string): { decision: "accept" | "reject" | "modify"; note: string } | null {
  const m = text.trim().match(/^(accept|yes|reject|no|modify)\b[\s:,.-]*([\s\S]*)$/i);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const decision = word === "yes" ? "accept" : word === "no" ? "reject" : (word as "accept" | "reject" | "modify");
  return { decision, note: m[2].trim().replace(/^\W+$/, "") };
}
