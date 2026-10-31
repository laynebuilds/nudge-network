import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { get, head, list, put, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";
import { Redis } from "@upstash/redis";

// JSON storage. Private Vercel Blob in production (BLOB_READ_WRITE_TOKEN set), local .data/ otherwise.
// Every read bypasses the CDN cache so polling sees fresh run state.
// Upstash Redis when connected (preferred: Blob's free tier ran out of read operations), then Blob, then local.
const redisUrl = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
let redisClient: Redis | null = null;
const redis = () => (redisClient ??= new Redis({ url: redisUrl()!, token: redisToken()!, automaticDeserialization: false }));
const useRedis = () => !!(redisUrl() && redisToken());
const useBlob = () => !useRedis() && !!process.env.BLOB_READ_WRITE_TOKEN;

// Each key is a hash: d = the JSON text exactly as written, v = version used as the etag for conditional
// writes. The JSON stays a plain string so nothing is re-encoded (Lua's cjson would turn [] into {}).
// Atomic compare-and-set: write only if the stored version still matches (or always when none given).
const CAS = `local v = tonumber(redis.call("HGET", KEYS[1], "v") or "0")
if ARGV[2] ~= "" and tostring(v) ~= ARGV[2] then return 0 end
redis.call("HSET", KEYS[1], "v", v + 1, "d", ARGV[1])
return 1`;
const LOCAL = join(process.cwd(), ".data");

export type Stored<T> = { data: T; etag: string | null };

export async function readJson<T>(path: string): Promise<Stored<T> | null> {
  if (useRedis()) {
    // With automatic deserialization off the client returns the raw [v, d] array, otherwise an object.
    const rec = (await redis().hmget(path, "v", "d")) as unknown;
    const [v, d] = Array.isArray(rec)
      ? (rec as (string | null)[])
      : [(rec as Record<string, string | null> | null)?.v ?? null, (rec as Record<string, string | null> | null)?.d ?? null];
    if (d == null) return null;
    return { data: JSON.parse(d) as T, etag: String(v ?? "0") };
  }
  if (!useBlob()) {
    const p = join(LOCAL, path);
    return existsSync(p) ? { data: JSON.parse(readFileSync(p, "utf8")) as T, etag: null } : null;
  }
  // get() can return a weak etag for compressed content, which conditional writes never match.
  // Take the strong etag from head() on both sides of the read and retry if the blob changed in between.
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await headEtag(path);
    if (!before) return null;
    const res = await get(path, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    const data = (await new Response(res.stream).json()) as T;
    if ((await headEtag(path)) === before) return { data, etag: before };
  }
  throw new Error(`${path} kept changing while being read`);
}

async function headEtag(path: string): Promise<string | null> {
  try {
    return (await head(path)).etag;
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

// ifMatch makes the write conditional: it fails with false if someone else wrote first.
export async function writeJson(path: string, data: unknown, opts: { ifMatch?: string | null } = {}): Promise<boolean> {
  if (useRedis()) {
    const ok = await redis().eval(CAS, [path], [JSON.stringify(data ?? null), opts.ifMatch ?? ""]);
    return Number(ok) === 1;
  }
  const body = JSON.stringify(data, null, 2);
  if (!useBlob()) {
    const p = join(LOCAL, path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, body);
    return true;
  }
  try {
    await put(path, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      ...(opts.ifMatch ? { ifMatch: opts.ifMatch } : {}),
    });
    return true;
  } catch (err) {
    if (err instanceof BlobPreconditionFailedError) return false;
    throw err;
  }
}

export async function listJson(prefix: string): Promise<string[]> {
  if (useRedis()) {
    const out: string[] = [];
    let cursor: string | number = 0;
    do {
      const [next, keys]: [string | number, string[]] = await redis().scan(cursor, { match: `${prefix}*`, count: 500 });
      out.push(...keys);
      cursor = next;
    } while (String(cursor) !== "0");
    return out;
  }
  if (!useBlob()) {
    const dir = join(LOCAL, prefix);
    return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(prefix, f)) : [];
  }
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor });
    out.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}
