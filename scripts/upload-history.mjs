// Upload a reviewed history file to your twin in a deployed Nudge Network.
// NUDGE_TOKEN=<token from your invite link> npm run upload -- --file .data/ingest/layne.json --url https://...
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";

const { values } = parseArgs({ options: { file: { type: "string" }, url: { type: "string" } } });
const token = process.env.NUDGE_TOKEN;
if (!values.file || !values.url || !token) {
  console.error("Usage: NUDGE_TOKEN=... npm run upload -- --file <json> --url <deployment url>");
  process.exit(1);
}
const json = JSON.parse(readFileSync(values.file, "utf8"));
const items = json.items ?? json;
let added = 0;
for (let i = 0; i < items.length; i += 100) {
  const res = await fetch(new URL("/api/me/items", values.url), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(items.slice(i, i + 100)),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`Upload failed: ${body.error}`);
    process.exit(1);
  }
  added += body.added;
}
console.log(`Uploaded ${added} new items.`);
