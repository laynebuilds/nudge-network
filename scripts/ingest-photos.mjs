// Connect your Apple Photos library to your twin. Reads the library on this Mac read-only, picks recent
// photos (favourites and photos of people Photos has named come first, at most a couple per day),
// shrinks Photos' own thumbnails with sips, and sends them to your twin for captioning. Only the captions
// are stored; the images never leave the request.
//
// NUDGE_TOKEN=<token from your invite link> npm run ingest:photos -- --url https://nudge-network.vercel.app
// Options: --days 90 --max 60 --dry-run
// Needs Node 22.5+ and Full Disk Access for the terminal.
import { parseArgs } from "node:util";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    library: { type: "string", default: join(homedir(), "Pictures", "Photos Library.photoslibrary") },
    days: { type: "string", default: "90" },
    max: { type: "string", default: "60" },
    perDay: { type: "string", default: "2" },
    "dry-run": { type: "boolean", default: false },
  },
});
const token = process.env.NUDGE_TOKEN;
if (!values["dry-run"] && (!values.url || !token)) {
  console.error("Usage: NUDGE_TOKEN=... npm run ingest:photos -- --url https://... [--days 90] [--max 60] [--dry-run]");
  process.exit(1);
}

const APPLE_EPOCH = 978307200;
const SCREENSHOT = 10;
const db = new DatabaseSync(`file:${join(values.library, "database", "Photos.sqlite")}?mode=ro`, { readOnly: true });
const since = Date.now() / 1000 - Number(values.days) * 86400 - APPLE_EPOCH;

const rows = db
  .prepare(
    `SELECT a.ZUUID uuid, a.ZFAVORITE fav, a.ZDATECREATED created, m.ZTITLE place,
       (SELECT group_concat(DISTINCT p.ZFULLNAME) FROM ZDETECTEDFACE f JOIN ZPERSON p ON p.Z_PK = f.ZPERSON
        WHERE f.ZASSET = a.Z_PK AND p.ZFULLNAME IS NOT NULL AND p.ZFULLNAME != '') people
     FROM ZASSET a LEFT JOIN ZMOMENT m ON m.Z_PK = a.ZMOMENT
     WHERE a.ZTRASHEDSTATE = 0 AND a.ZHIDDEN = 0 AND a.ZKIND = 0 AND IFNULL(a.ZKINDSUBTYPE, 0) != ? AND a.ZDATECREATED > ?
     ORDER BY a.ZDATECREATED DESC`
  )
  .all(SCREENSHOT, since);

// Score, keep the best few per day so one busy day does not crowd out the rest, then the best overall.
const score = (r) => (r.fav ? 3 : 0) + (r.people ? 2 : 0) + (r.place ? 1 : 0);
const byDay = new Map();
for (const r of rows) {
  const day = new Date((r.created + APPLE_EPOCH) * 1000).toISOString().slice(0, 10);
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push({ ...r, day });
}
const picked = [...byDay.values()]
  .flatMap((list) => list.sort((x, y) => score(y) - score(x)).slice(0, Number(values.perDay)))
  .sort((x, y) => score(y) - score(x) || y.created - x.created)
  .slice(0, Number(values.max));

function thumbnail(uuid) {
  const dir = join(values.library, "resources", "derivatives", uuid[0]);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.startsWith(uuid) && /\.jpe?g$/i.test(f));
  if (!files.length) return null;
  return files.map((f) => join(dir, f)).sort((x, y) => statSync(y).size - statSync(x).size)[0];
}

const tmp = mkdtempSync(join(tmpdir(), "nudge-photos-"));
const ready = [];
for (const r of picked) {
  const src = thumbnail(r.uuid);
  if (!src) continue;
  const out = join(tmp, `${r.uuid}.jpg`);
  execFileSync("sips", ["-Z", "1024", "-s", "format", "jpeg", "-s", "formatOptions", "70", src, "--out", out], { stdio: "ignore" });
  const context = [r.place && `place: ${r.place}`, r.people && `people Photos has named: ${r.people}`, r.fav && "marked favourite"]
    .filter(Boolean)
    .join("; ");
  ready.push({ name: r.uuid.slice(0, 12), ts: r.day, context, data: readFileSync(out).toString("base64") });
}
rmSync(tmp, { recursive: true, force: true });

console.log(`${rows.length} photos in the last ${values.days} days, picked ${picked.length}, ${ready.length} have a local thumbnail.`);
if (values["dry-run"]) {
  for (const r of ready) console.log(`  ${r.ts}  ${r.context || "-"}`);
  process.exit(0);
}

let added = 0;
for (let i = 0; i < ready.length; i += 6) {
  const res = await fetch(new URL("/api/me/photos", values.url), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ images: ready.slice(i, i + 6) }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`Stopped: ${body.error}`);
    process.exit(1);
  }
  added += body.added;
  console.log(`  ${Math.min(i + 6, ready.length)}/${ready.length} sent, ${added} captions kept`);
}
console.log(`Done. ${added} photos are now part of your twin's history.`);
