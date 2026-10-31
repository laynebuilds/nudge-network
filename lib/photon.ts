import { getProfile, listFounders } from "./founders";
import { readJson, writeJson } from "./store";
import type { Run } from "./runs";

// Photon v2 puts the twins on iMessage. Each founder is paired with a shared line in the Photon project.
// When a negotiation ends in an opportunity, each founder gets a text with the headline and a link, and
// decides by replying. Off unless PHOTON_API_KEY and PHOTON_PROJECT_ID are set.
const API = "https://api.photon.codes/v1";
export const photonEnabled = () => !!(process.env.PHOTON_API_KEY && process.env.PHOTON_PROJECT_ID);
export const publicUrl = () => process.env.PUBLIC_URL ?? "https://nudge-network.vercel.app";
export const normalizePhone = (p: string) => p.replace(/[^\d+]/g, "");

type PhotonUser = { id: string; handle: string; kind: "human" | "agent" };
type PhotonMessage = {
  id: string;
  content: { type: string; text?: string };
  sentBy: PhotonUser;
  receivedBy?: PhotonUser;
  space: { id: string };
  createdAt: string;
};

async function photon<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/projects/${process.env.PHOTON_PROJECT_ID}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.PHOTON_API_KEY}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Photon ${path} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

const received = (pageSize = 50) =>
  photon<{ items: PhotonMessage[] }>(`/messages?direction=received&order=desc&pageSize=${pageSize}`).then((r) => r.items);

// A shared line only reaches someone who has texted it, so their latest inbound message tells us the
// conversation (space) and which line (agent user) to answer from.
async function conversationWith(phone: string) {
  const want = normalizePhone(phone);
  const msg = (await received(100)).find((m) => normalizePhone(m.sentBy.handle) === want);
  return msg && msg.receivedBy ? { spaceId: msg.space.id, senderId: msg.receivedBy.id } : null;
}

async function send(spaceId: string, senderId: string, text: string, key: string) {
  await photon("/messages", {
    method: "POST",
    headers: { "idempotency-key": key },
    body: JSON.stringify({ spaceId, senderId, content: { type: "text", format: "plain", text } }),
  });
}

// Only a concrete ask is worth interrupting someone for. Runs from before decisions existed fall back to
// the old rule (anything but no_fit).
export const askOf = (run: Run) => run.outcome?.decision ?? (run.outcome && run.outcome.verdict !== "no_fit" ? { needed: true, ask: run.outcome.headline } : null);

export async function notifyOpportunity(run: Run): Promise<string[]> {
  const decision = askOf(run);
  if (!photonEnabled() || !run.outcome || !decision?.needed || !decision.ask) return [];
  const sent: string[] = [];
  for (const [me, other] of [
    [run.a, run.b],
    [run.b, run.a],
  ] as const) {
    const phone = (await getProfile(me.id)).phone;
    const convo = phone && (await conversationWith(phone));
    if (!convo) continue;
    const text = [
      `Your twin talked with ${other.name}'s twin.`,
      "",
      run.outcome.headline,
      "",
      `Proposed next step: ${decision.ask}`,
      "",
      `Reply YES to go ahead, NO to pass, or just tell me what you would change. ${other.name} hears nothing until you both say yes.`,
      "",
      `Full conversation: ${publicUrl()}/runs/${run.id}/chat`,
    ].join("\n");
    await send(convo.spaceId, convo.senderId, text, `opportunity:${run.id}:${me.id}`);
    sent.push(me.id);
  }
  return sent;
}

// YES / NO, or a sentence about what to change (anything longer than a couple of words counts as that).
// Both founders have decided: tell both of them, and when both said yes, open the door by sharing the next
// step and each other's number (saying yes to the intro is the consent for that).
export async function announceBoth(run: Run) {
  const ask = askOf(run)?.ask ?? run.outcome?.headline ?? "";
  for (const [me, other] of [
    [run.a, run.b],
    [run.b, run.a],
  ] as const) {
    const mine = run.decisions[me.id]?.decision;
    const theirs = run.decisions[other.id]?.decision;
    const phone = (await getProfile(me.id)).phone;
    const convo = phone && (await conversationWith(phone));
    if (!convo || !mine || !theirs) continue;
    const otherPhone = (await getProfile(other.id)).phone;
    const text =
      mine === "accept" && theirs === "accept"
        ? [
            `${other.name} said yes too. You're both in.`,
            "",
            `Next step: ${ask}`,
            ...(otherPhone ? ["", `Reach ${other.name.split(" ")[0]} directly at ${otherPhone}.`] : []),
            "",
            `${publicUrl()}/runs/${run.id}/chat`,
          ].join("\n")
        : theirs === "reject"
          ? `${other.name} passed on this one. Nothing else happens, and your twin keeps looking. ${publicUrl()}`
          : theirs === "modify"
            ? `${other.name} would change something: ${run.decisions[other.id]!.note}. ${publicUrl()}/runs/${run.id}`
            : `Both of you have decided. ${publicUrl()}/runs/${run.id}`;
    await send(convo.spaceId, convo.senderId, text, `both:${run.id}:${me.id}`);
  }
}

export function parseDecision(text: string): { decision: "accept" | "reject" | "modify"; note: string } | null {
  const t = text.trim();
  if (/^(yes|y|yep|yeah|accept|go ahead|sure|ok|okay)\b/i.test(t)) return { decision: "accept", note: t.replace(/^\S+\W*/, "").replace(/^\W+$/, "") };
  if (/^(no|n|nope|pass|reject|decline)\b/i.test(t)) return { decision: "reject", note: t.replace(/^\S+\W*/, "").replace(/^\W+$/, "") };
  const note = t.replace(/^(modify|change)\b\W*/i, "");
  return note.split(/\s+/).length >= 3 ? { decision: "modify", note } : null;
}

// Pull new inbound texts from Photon and turn replies into decisions. Called from the webhook (which only
// signals "something arrived"; everything acted on is re-read from Photon with our key) and the watchdog.
export async function processInbound(): Promise<number> {
  if (!photonEnabled()) return 0;
  const { listRuns, getRun, saveRun } = await import("./runs");
  const seen = new Set((await readJson<string[]>("photon/processed.json"))?.data ?? []);
  const fresh = (await received(50)).filter((m) => !seen.has(m.id) && m.content.type === "text" && m.receivedBy).reverse();
  if (!fresh.length) return 0;

  // One phone can belong to several twins (test sign-ups), so map a number to all of them and act on the
  // conversation that actually texted this person most recently and is still waiting on them.
  const phones = new Map<string, Set<string>>();
  for (const f of await listFounders()) {
    const phone = (await getProfile(f.id)).phone;
    if (!phone) continue;
    const key = normalizePhone(phone);
    if (!phones.has(key)) phones.set(key, new Set());
    phones.get(key)!.add(f.id);
  }
  for (const m of fresh) {
    seen.add(m.id);
    const owners = phones.get(normalizePhone(m.sentBy.handle));
    if (!owners) continue;
    const reply = (text: string) => send(m.space.id, m.receivedBy!.id, text, `reply:${m.id}`);
    const parsed = parseDecision(m.content.text ?? "");
    const runs = (await listRuns()).filter((r) => r.stage === "done");
    const pending = runs.find((r) => (r.notified ?? []).some((id) => owners.has(id) && !r.decisions[id]));
    const ownerId = pending ? (pending.notified ?? []).find((id) => owners.has(id) && !pending.decisions[id])! : null;
    if (!pending || !ownerId) {
      if (parsed) await reply(`Nothing is waiting for your decision right now. ${publicUrl()}`);
      continue;
    }
    if (!parsed) {
      await reply("Reply YES to go ahead, NO to pass, or tell me in a sentence what you would change.");
      continue;
    }
    const run = (await getRun(pending.id))!.data;
    run.decisions[ownerId] = { decision: parsed.decision, note: parsed.note, at: new Date().toISOString() };
    await saveRun(run);
    const other = run.a.id === ownerId ? run.b : run.a;
    const said = parsed.decision === "accept" ? "you're in" : parsed.decision === "reject" ? "you passed" : `you'd change: ${parsed.note}`;
    if (!run.decisions[other.id]) {
      await reply(`Got it, ${said}. I will let you know when ${other.name} decides.`);
      continue;
    }
    await reply(`Got it, ${said}.`);
    await announceBoth(run);
  }
  await writeJson("photon/processed.json", [...seen].slice(-500));
  return fresh.length;
}
