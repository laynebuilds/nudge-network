import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { get, head, list, put, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";

// JSON storage. Private Vercel Blob in production (BLOB_READ_WRITE_TOKEN set), local .data/ otherwise.
// Every read bypasses the CDN cache so polling sees fresh run state.
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL = join(process.cwd(), ".data");

export type Stored<T> = { data: T; etag: string | null };

export async function readJson<T>(path: string): Promise<Stored<T> | null> {
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
