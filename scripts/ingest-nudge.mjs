// Build a founder's digital history from their own Mac, using Nudge (github.com/jasnoorkaur111/imessage-mcp)
// as the reader for iMessage and Apple Mail. Runs locally; nothing leaves the machine.
//
// npm run ingest:nudge -- --id layne --contacts "Jasnoor,Kai" --days 90
// then review .data/ingest/layne.json and push it with npm run upload.
//
// Needs Node 22.5+ (node:sqlite) and Full Disk Access for the terminal. The output contains real messages
// and stays in .data/ (gitignored) until you upload it.
import { parseArgs } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const { values } = parseArgs({
  options: {
    id: { type: "string" },
    contacts: { type: "string", default: "" },
    days: { type: "string", default: "90" },
    perChat: { type: "string", default: "40" },
    mailDays: { type: "string", default: "90" },
  },
});
if (!values.id) {
  console.error('Usage: --id <your-id> [--contacts "Name One,Name Two"] [--days 90]');
  process.exit(1);
}

const nudge = resolve((process.env.NUDGE_PATH ?? join(homedir(), "imessage-mcp")).replace(/^~/, homedir()));
const lib = await import(pathToFileURL(join(nudge, "lib.mjs")).href);
const days = Number(values.days);
const items = [];
const only = values.contacts.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
const wanted = (name) => !only.length || only.some((c) => String(name ?? "").toLowerCase().includes(c));

for (const { conv, msgs } of lib.recentByConv(days, Number(values.perChat))) {
  if (conv.automated || !conv.inContacts || !wanted(conv.name)) continue;
  const ordered = [...msgs].reverse();
  const text = ordered.map((m) => `${m.fromMe ? "Me" : conv.isGroup ? lib.who(m.sender) : conv.name}: ${lib.msgText(m)}`).join("\n");
  if (!text.trim()) continue;
  items.push({
    id: `${values.id}:imessage:${conv.chatIds[0]}`,
    source: "imessage",
    ts: new Date(Number(ordered.at(-1).ts) * 1000).toISOString().slice(0, 10),
    with: conv.name,
    text,
  });
}

try {
  const mail = await import(pathToFileURL(join(nudge, "mail.mjs")).href);
  if (mail.mailAvailable()) {
    for (const m of mail.mailSorted(Number(values.mailDays), 200)) {
      if (!["request", "person"].includes(m.kind) || !wanted(`${m.from} ${m.email}`)) continue;
      items.push({
        id: `${values.id}:email:${m.id.replace(/^mail:/, "")}`,
        source: "email",
        ts: new Date(m.ts * 1000).toISOString().slice(0, 10),
        with: m.from,
        subject: m.subject,
        text: m.snippet ?? "",
      });
    }
  }
} catch (err) {
  console.warn(`Apple Mail skipped: ${err.message}`);
}

const dir = join(process.cwd(), ".data", "ingest");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${values.id}.json`);
writeFileSync(file, JSON.stringify({ items }, null, 2));
console.log(`Wrote ${items.length} items to ${file}. Read it, delete anything you do not want your twin to know, then:`);
console.log(`NUDGE_TOKEN=... npm run upload -- --file ${file} --url https://<your deployment>`);
