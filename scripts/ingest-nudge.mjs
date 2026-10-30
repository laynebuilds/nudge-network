// Build a founder's digital history from their own Mac, using Nudge (github.com/jasnoorkaur111/imessage-mcp)
// as the reader for iMessage and Apple Mail. Runs locally; nothing leaves the machine.
//
// NUDGE_PATH=~/imessage-mcp node scripts/ingest-nudge.mjs --id maya --name "Maya Chen" --bio "..." --days 90
//
// Needs Node 22.5+ (node:sqlite) and Full Disk Access for the terminal. Review the output before using it:
// the file contains real messages. data/founders/*/history.json from real people is gitignored.
import { parseArgs } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

const { values } = parseArgs({
  options: {
    id: { type: "string" },
    name: { type: "string" },
    bio: { type: "string", default: "" },
    days: { type: "string", default: "90" },
    perChat: { type: "string", default: "40" },
    mailDays: { type: "string", default: "90" },
  },
});
if (!values.id || !values.name) {
  console.error("Usage: --id <slug> --name <full name> [--bio text] [--days 90]");
  process.exit(1);
}

const nudge = resolve((process.env.NUDGE_PATH ?? join(homedir(), "imessage-mcp")).replace(/^~/, homedir()));
const lib = await import(pathToFileURL(join(nudge, "lib.mjs")).href);
const days = Number(values.days);
const items = [];

for (const { conv, msgs } of lib.recentByConv(days, Number(values.perChat))) {
  if (conv.automated || !conv.inContacts) continue;
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
      if (!["request", "person"].includes(m.kind)) continue;
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

const dir = join(process.cwd(), "data", "founders", values.id);
mkdirSync(dir, { recursive: true });
const out = { owner: { id: values.id, name: values.name, public_bio: values.bio }, items };
writeFileSync(join(dir, "history.json"), JSON.stringify(out, null, 2));
console.log(`Wrote ${items.length} items to ${join(dir, "history.json")}.`);
console.log("Next: write intent.sealed.json in the same folder (red lines + probe answers) without showing it to the twin.");
