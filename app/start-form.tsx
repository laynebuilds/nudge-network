"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/client";
import { Textarea } from "@/components/ui/textarea";

type F = { id: string; name: string; demo: boolean };

export default function StartForm({
  founders,
  defaultA,
  defaultB,
  defaultGoal,
}: {
  founders: F[];
  defaultA: string;
  defaultB: string;
  defaultGoal: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const [goal, setGoal] = useState(defaultGoal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const res = await api<{ id: string }>("/api/runs", { method: "POST", body: { a, b, goal } });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.push(`/runs/${res.body.id}/chat`);
  }

  const pick = (value: string, set: (v: string) => void) => (
    <select value={value} onChange={(e) => set(e.target.value)}>
      {founders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
          {f.demo ? " (demo)" : ""}
        </option>
      ))}
    </select>
  );

  return (
    <div className="form">
      <div className="pair">
        <label>Twin A {pick(a, setA)}</label>
        <label>Twin B {pick(b, setB)}</label>
      </div>
      <Textarea label="Goal" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} />
      {error && <p className="error">{error}</p>}
      {a === b && <p className="muted">Pick two different people.</p>}
      <button onClick={start} disabled={busy || a === b || !goal.trim()}>
        {busy ? "Starting..." : "Let the twins talk"}
      </button>
    </div>
  );
}
