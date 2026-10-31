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

// Only a real opportunity is worth interrupting someone for.
export async function notifyOpportunity(run: Run): Promise<string[]> {
  if (!photonEnabled() || !run.outcome || run.outcome.verdict === "no_fit") return [];
  const sent: string[] = [];
  for (const [me, other, side] of [
    [run.a, run.b, "a"],
    [run.b, run.a, "b"],
  ] as const) {
    const phone = (await getProfile(me.id)).phone;
    const convo = phone && (await conversationWith(phone));
    if (!convo) continue;
    const open = run.outcome.unresolved.filter((u) => u.for_owner === "both" || u.for_owner === side);
    const text = [
      `Your twin met ${other.name}'s twin and found an opportunity.`,
      "",
      run.outcome.headline,
      ...(open.length ? ["", `Needs you: ${open[0].question}${open.length > 1 ? ` (+${open.length - 1} more)` : ""}`] : []),
      "",
      `Read it: ${publicUrl()}/runs/${run.id}/chat`,
      "Reply ACCEPT, REJECT, or MODIFY followed by what you would change.",
    ].join("\n");
    await send(convo.spaceId, convo.senderId, text, `opportunity:${run.id}:${me.id}`);
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

// Pull new inbound texts from Photon and turn replies into decisions. Called from the webhook (which only
// signals "something arrived"; everything acted on is re-read from Photon with our key) and the watchdog.
export async function processInbound(): Promise<number> {
  if (!photonEnabled()) return 0;
  const { listRuns, getRun, saveRun } = await import("./runs");
  const seen = new Set((await readJson<string[]>("photon/processed.json"))?.data ?? []);
  const fresh = (await received(50)).filter((m) => !seen.has(m.id) && m.content.type === "text" && m.receivedBy).reverse();
  if (!fresh.length) return 0;

  const phones = new Map<string, string>();
  for (const f of await listFounders()) {
    const phone = (await getProfile(f.id)).phone;
    if (phone) phones.set(normalizePhone(phone), f.id);
  }
  for (const m of fresh) {
    seen.add(m.id);
    const ownerId = phones.get(normalizePhone(m.sentBy.handle));
    if (!ownerId) continue;
    const reply = (text: string) => send(m.space.id, m.receivedBy!.id, text, `reply:${m.id}`);
    const parsed = parseDecision(m.content.text ?? "");
    const pending = (await listRuns()).find((r) => r.stage === "done" && (r.a.id === ownerId || r.b.id === ownerId) && !r.decisions[ownerId]);
    if (!pending) {
      if (parsed) await reply(`Nothing is waiting for your decision right now. ${publicUrl()}`);
      continue;
    }
    if (!parsed) {
      await reply("Reply ACCEPT, REJECT, or MODIFY followed by what you would change.");
      continue;
    }
    if (parsed.decision === "modify" && !parsed.note) {
      await reply("What would you change? Reply MODIFY followed by the change.");
      continue;
    }
    const run = (await getRun(pending.id))!.data;
    run.decisions[ownerId] = { decision: parsed.decision, note: parsed.note, at: new Date().toISOString() };
    await saveRun(run);
    const other = run.a.id === ownerId ? run.b : run.a;
    await reply(
      `Got it: ${parsed.decision}${parsed.note ? ` (${parsed.note})` : ""}. ${
        run.decisions[other.id]
          ? `${other.name} has decided too, so everything is open now: ${publicUrl()}/runs/${run.id}`
          : `I will let you know when ${other.name} decides.`
      }`
    );
  }
  await writeJson("photon/processed.json", [...seen].slice(-500));
  return fresh.length;
}
