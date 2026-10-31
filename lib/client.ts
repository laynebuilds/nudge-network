// Browser helpers for the signed-in app. Imported only from client components.
import { useEffect, useRef, useState } from "react";
import type { RunView } from "./runs";

export type ApiResult<T> = { ok: true; body: T } | { ok: false; error: string; status: number };

// Browser-side JSON call. A timeout or crash can come back as an HTML error page and a dropped connection
// throws, so every failure is turned into a message the page can show instead of breaking the control.
export async function api<T = Record<string, unknown>>(url: string, init: { method?: string; body?: unknown; keepalive?: boolean } = {}): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      cache: "no-store",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      keepalive: init.keepalive,
    });
  } catch {
    return { ok: false, error: "Could not reach Jebln. Check your connection and try again.", status: 0 };
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (res.ok && body) return { ok: true, body };
  const fallback =
    res.status === 401 ? "Sign in to continue." : res.status === 504 ? "That took too long. Try again with less at once." : "Something went wrong. Try again.";
  return { ok: false, error: body?.error ?? fallback, status: res.status };
}

const STALL_MS = 300_000;

// Polls a run until it finishes. The server drives runs on its own; if one has not moved for a while (a
// step crashed or a background hop was lost) the page nudges it once so it picks up again.
export function useRun(id: string, every = 3000) {
  const [run, setRun] = useState<RunView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let lastKey = "";
    let lastChange = Date.now();
    const loop = async () => {
      while (alive) {
        const res = await api<RunView>(`/api/runs/${id}`);
        if (!alive) return;
        if (!res.ok) {
          // A network blip is retried; a real answer (not found, signed out) ends the loop.
          if (res.status !== 0 && res.status < 500) return setError(res.error);
        } else {
          setRun(res.body);
          if (res.body.stage === "done" || res.body.stage === "error") return;
          const key = `${res.body.stage}:${res.body.transcript.length}`;
          if (key !== lastKey) {
            lastKey = key;
            lastChange = Date.now();
          } else if (Date.now() - lastChange > STALL_MS) {
            lastChange = Date.now();
            api(`/api/runs/${id}/step`, { method: "POST" });
          }
        }
        await new Promise((r) => setTimeout(r, every));
      }
    };
    loop();
    return () => {
      alive = false;
    };
  }, [id, every]);

  return { run, setRun, error };
}

export type SaveState = "idle" | "saving" | "saved" | "error";

// Debounced autosave. Calls save(value, lastSaved) once the value has been still for `delay` ms. The first
// value seen while enabled counts as already saved, so loading a form does not write it back. A change
// still waiting when the page is hidden or closed is flushed with keepalive, so leaving loses nothing.
// save returns null on success or an error message.
export function useAutosave<T>(
  value: T,
  save: (value: T, lastSaved: T, opts: { keepalive: boolean }) => Promise<string | null>,
  { enabled = true, delay = 800 }: { enabled?: boolean; delay?: number } = {}
) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const saved = useRef<{ value: T; key: string } | null>(null);
  const latest = useRef({ value, save });
  latest.current = { value, save };

  const flush = async (keepalive: boolean) => {
    const { value: v, save: fn } = latest.current;
    const key = JSON.stringify(v);
    if (!saved.current || saved.current.key === key) return;
    const prev = saved.current.value;
    saved.current = { value: v, key };
    if (!keepalive) setState("saving");
    const err = await fn(v, prev, { keepalive });
    if (keepalive) return;
    // On failure, forget the attempt so the next edit (or a retry) sends it again.
    if (err) saved.current = { value: prev, key: JSON.stringify(prev) };
    setError(err ?? "");
    setState(err ? "error" : "saved");
  };

  const key = JSON.stringify(value);
  useEffect(() => {
    if (!enabled) return;
    if (!saved.current) {
      saved.current = { value, key };
      return;
    }
    if (saved.current.key === key) return;
    const t = setTimeout(() => flush(false), delay);
    return () => clearTimeout(t);
  }, [key, enabled, delay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHide = () => flush(true);
    const onVisibility = () => document.visibilityState === "hidden" && onHide();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, error, retry: () => flush(false) };
}
