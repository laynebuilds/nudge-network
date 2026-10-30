import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { loadFounder, loadSealed } from "./founders";
import { negotiate, type NegotiationResult, type TranscriptEntry } from "./negotiate";
import { scoreFidelity, type Fidelity } from "./fidelity";

export const RUNS_DIR = join(process.cwd(), "runs");

export type Decision = { decision: "accept" | "reject" | "modify"; note: string; at: string };

export type Run = {
  id: string;
  createdAt: string;
  goal: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  stage: "queued" | "negotiating" | "mediating" | "ratifying" | "revising" | "scoring" | "done" | "error";
  error?: string;
  transcript: TranscriptEntry[];
  result?: Omit<NegotiationResult, "transcript">;
  fidelity?: Fidelity;
  decisions: Record<string, Decision>;
};

const file = (id: string) => join(RUNS_DIR, `${id.replace(/[^a-z0-9-]/gi, "")}.json`);

export function saveRun(run: Run) {
  mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(file(run.id), JSON.stringify(run, null, 2));
}

export function getRun(id: string): Run | null {
  return existsSync(file(id)) ? (JSON.parse(readFileSync(file(id), "utf8")) as Run) : null;
}

export function listRuns(): Run[] {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(RUNS_DIR, f), "utf8")) as Run)
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

export function createRun(aId: string, bId: string, goal: string): Run {
  const a = loadFounder(aId);
  const b = loadFounder(bId);
  const run: Run = {
    id: randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    goal,
    a: { id: a.owner.id, name: a.owner.name },
    b: { id: b.owner.id, name: b.owner.name },
    stage: "queued",
    transcript: [],
    decisions: {},
  };
  saveRun(run);
  return run;
}

// Full pipeline: negotiate, mediate, ratify, then score against sealed intent. Persists after every step
// so the UI can poll progress.
export async function executeRun(run: Run): Promise<Run> {
  const a = loadFounder(run.a.id);
  const b = loadFounder(run.b.id);
  try {
    const { transcript, ...result } = await negotiate(a, b, run.goal, {
      onStage: (stage) => {
        run.stage = stage as Run["stage"];
        saveRun(run);
      },
      onTurn: (e) => {
        run.transcript.push(e);
        saveRun(run);
      },
    });
    run.transcript = transcript;
    run.result = result;
    run.stage = "scoring";
    saveRun(run);

    const sa = loadSealed(a.owner.id);
    const sb = loadSealed(b.owner.id);
    if (sa && sb) run.fidelity = await scoreFidelity(a, b, sa, sb, transcript, result.outcome);
    run.stage = "done";
  } catch (err) {
    run.stage = "error";
    run.error = err instanceof Error ? err.message : String(err);
  }
  saveRun(run);
  return run;
}
