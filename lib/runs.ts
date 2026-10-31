import { randomUUID } from "node:crypto";
import { loadFounder, loadSealed } from "./founders";
import { advance, initialState, type NegotiationState, type Stage } from "./negotiate";
import { scoreFidelity, type Fidelity } from "./fidelity";
import { listJson, readJson, writeJson } from "./store";

export type Decision = { decision: "accept" | "reject" | "modify"; note: string; at: string };

export type Run = NegotiationState & {
  id: string;
  createdAt: string;
  createdBy: string | null;
  a: { id: string; name: string };
  b: { id: string; name: string };
  error?: string;
  fidelity?: Fidelity;
  decisions: Record<string, Decision>;
  lockUntil?: number;
  updatedAt?: string;
  notified?: string[];
};

const path = (id: string) => `runs/${id.replace(/[^a-z0-9-]/gi, "")}.json`;

export async function getRun(id: string) {
  return readJson<Run>(path(id));
}

export async function saveRun(run: Run, ifMatch?: string | null) {
  run.updatedAt = new Date().toISOString();
  return writeJson(path(run.id), run, { ifMatch });
}

export async function listRuns(): Promise<Run[]> {
  const runs = await Promise.all((await listJson("runs/")).map(async (p) => (await readJson<Run>(p))?.data));
  return runs.filter((r): r is Run => !!r).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

export async function createRun(aId: string, bId: string, goal: string, createdBy: string | null): Promise<Run> {
  const [a, b] = await Promise.all([loadFounder(aId), loadFounder(bId)]);
  const run: Run = {
    ...initialState(a, b, goal),
    id: randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    createdBy,
    a: { id: a.owner.id, name: a.owner.name },
    b: { id: b.owner.id, name: b.owner.name },
    decisions: {},
  };
  await saveRun(run);
  return run;
}

const LEASE_MS = 280_000;
export const finished = (s: Stage) => s === "done" || s === "error";

// Take a lease on the run, do one step, write it back. Concurrent callers (two founders watching the same
// run) lose the conditional write and simply skip. Returns the run as it stands after the attempt.
export async function stepRun(id: string): Promise<Run | null> {
  const stored = await getRun(id);
  if (!stored) return null;
  const run = stored.data;
  if (finished(run.stage) || (run.lockUntil && run.lockUntil > Date.now())) return run;

  run.lockUntil = Date.now() + LEASE_MS;
  if (!(await saveRun(run, stored.etag))) return (await getRun(id))?.data ?? run;

  try {
    if (run.stage === "scoring") {
      const [sa, sb] = await Promise.all([loadSealed(run.a.id), loadSealed(run.b.id)]);
      if (sa?.probes.length && sb?.probes.length) {
        run.fidelity = await scoreFidelity(run.founders.a, run.founders.b, sa, sb, run.transcript, run.outcome!);
      }
      run.stage = "done";
      try {
        const { notifyOpportunity } = await import("./photon");
        run.notified = await notifyOpportunity(run);
      } catch (err) {
        console.error("Photon notify failed", err);
      }
    } else {
      await advance(run);
    }
  } catch (err) {
    run.stage = "error";
    run.error = err instanceof Error ? err.message : String(err);
  }
  run.lockUntil = undefined;
  await saveRun(run);
  return run;
}

// What a given viewer may see. Until both founders have decided, each sees only their own twin's
// private reasoning, their own open questions and their own twin's scorecard. After both decide,
// or for an admin who is not a party, everything is visible.
export function viewFor(run: Run, viewerId: string | null, admin: boolean) {
  const party = viewerId === run.a.id ? "a" : viewerId === run.b.id ? "b" : null;
  const bothDecided = !!run.decisions[run.a.id] && !!run.decisions[run.b.id];
  const full = bothDecided || (!party && admin);
  const { founders: _f, histories: _h, lockUntil: _l, ...rest } = run;
  void _f; void _h; void _l;
  if (full) return { ...rest, party, full };

  return {
    ...rest,
    party,
    full,
    transcript: run.transcript.map((e) =>
      e.side === party ? e : { ...e, turn: { ...e.turn, private_reasoning: "", evidence: [], owner_questions: [], terms: [] } }
    ),
    outcome: run.outcome && {
      ...run.outcome,
      unresolved: run.outcome.unresolved.filter((u) => u.for_owner === "both" || u.for_owner === party),
    },
    ratifications: run.ratifications && party ? ({ [party]: run.ratifications[party] } as Run["ratifications"]) : undefined,
    fidelity:
      run.fidelity && party
        ? {
            ...run.fidelity,
            owners: run.fidelity.owners.filter((o) => o.owner === viewerId),
            redLines: { violations: [], notes: "The red line audit is shown once both founders have decided." },
          }
        : undefined,
  };
}
export type RunView = ReturnType<typeof viewFor>;
