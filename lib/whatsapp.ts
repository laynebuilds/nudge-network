import type { HistoryItem } from "./schemas";

// Parses a WhatsApp "Export chat" .txt (iOS "[dd/mm/yyyy, hh:mm:ss] Name: text" or
// Android "dd/mm/yyyy, hh:mm - Name: text") into history items of ~40 messages each.
const LINE = /^‎?\[?(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),?\s+(\d{1,2}:\d{2})(?::\d{2})?\s*(?:[AaPp][Mm])?\]?\s*(?:-\s*)?([^:]{1,60}):\s([\s\S]*)$/;
const SKIP = /<Media omitted>|image omitted|video omitted|sticker omitted|audio omitted|Messages and calls are end-to-end encrypted|This message was deleted/i;

export function parseWhatsApp(raw: string, owner: string, chatName: string, me: string, maxMessages = 1500): HistoryItem[] {
  const lines = raw.split(/\r?\n/);
  // US exports are month first. Decide from the data: a first field over 12 means day first.
  const matches = lines.map((l) => l.match(LINE)).filter((m): m is RegExpMatchArray => !!m);
  const monthFirst = !matches.some((m) => Number(m[1]) > 12) && matches.some((m) => Number(m[2]) > 12);
  const msgs: { date: string; who: string; text: string }[] = [];
  for (const line of lines) {
    const m = line.match(LINE);
    if (m) {
      const [d, mo] = monthFirst ? [m[2], m[1]] : [m[1], m[2]];
      const y = m[3];
      const year = y.length === 2 ? `20${y}` : y;
      msgs.push({ date: `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`, who: m[5].trim(), text: m[6].trim() });
    } else if (msgs.length && line.trim()) {
      msgs[msgs.length - 1].text += `\n${line.trim()}`;
    }
  }
  const kept = msgs.filter((m) => !SKIP.test(m.text)).slice(-maxMessages);
  const items: HistoryItem[] = [];
  const slug = chatName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "chat";
  for (let i = 0; i < kept.length; i += 40) {
    const chunk = kept.slice(i, i + 40);
    items.push({
      id: `${owner}:whatsapp:${slug}-${i / 40}`,
      source: "whatsapp",
      ts: chunk.at(-1)!.date,
      with: chatName,
      text: chunk.map((m) => `${m.who.toLowerCase() === me.toLowerCase() ? "Me" : m.who}: ${m.text}`).join("\n"),
    });
  }
  return items;
}
