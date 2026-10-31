// One-off: repopulate a fresh store after the move from Vercel Blob to Upstash Redis. Rebuilds both
// founders' profiles from what exists outside the blocked Blob store, and points every known Clerk
// account at the real twin so test sign-ups stop creating duplicates.
import { readFileSync, existsSync } from "node:fs";
import { getProfile, saveProfile } from "../lib/founders";
import { writeJson } from "../lib/store";

const profiles = {
  layne: {
    name: "Layne Singh",
    public_bio: "Founder of Graby (graby.ai) and Minefirst (minefirst.ai): AI that finds and buys underpriced resale fashion on Vinted and eBay. London, now in San Francisco.",
    phone: "+447838523532",
    links: { linkedin: "https://www.linkedin.com/in/layne-singh", x: "https://x.com/laynebuilds", instagram: "https://www.instagram.com/laynebuilds/", website: "https://graby.ai", github: "https://github.com/laynebuilds" },
  },
  jasnoor: {
    name: "Jasnoor Kaur",
    public_bio: "Founder of SoinsAI, working on obeofit. Builds personal AI tools: Nudge, Orbit, Roster. San Francisco.",
    phone: "+12489869861",
    links: { linkedin: "https://www.linkedin.com/in/jasnoorkaur", x: "https://x.com/jasnoor111", website: "https://byjasnoor.com" },
  },
};
for (const [id, p] of Object.entries(profiles)) {
  const current = await getProfile(id);
  const items = [...current.items];
  if (id === "layne" && existsSync(".data/ingest/layne.json")) {
    const ingest = JSON.parse(readFileSync(".data/ingest/layne.json", "utf8")).items ?? [];
    for (const it of ingest) if (!items.some((x) => x.id === it.id)) items.push(it);
  }
  await saveProfile(id, { ...current, ...p, items });
  console.log(id, "items", items.length);
}

const accounts: Record<string, string> = {
  user_3LRSB9VOiv2RZXQOefVPPXtIT2i: "jasnoor",
  user_3LRYu2drcwMHor4R8ULcj2xUkAq: "jasnoor",
  user_3LRZFvTOY2zrnkNUON4hbWYP2oY: "jasnoor",
  user_3LRZPRHRgF5Q74uo1vqj7DBB4ds: "jasnoor",
  user_3LRWWzxAocuauGBkKWnNk29ERV3: "layne",
  user_3LRaap1cAoi1AOllrv5iLTZGeyw: "layne",
};
for (const [user, founderId] of Object.entries(accounts)) await writeJson(`accounts/${user}.json`, { founderId, linkedAt: new Date().toISOString() });
await writeJson("founders/index.json", []);
console.log("accounts linked", Object.keys(accounts).length);
