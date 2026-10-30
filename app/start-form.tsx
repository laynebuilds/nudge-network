"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type F = { id: string; name: string; public_bio: string };

export default function StartForm({ founders, defaultGoal }: { founders: F[]; defaultGoal: string }) {
  const router = useRouter();
  const [a, setA] = useState(founders[0]?.id ?? "");
  const [b, setB] = useState(founders[1]?.id ?? "");
  const [goal, setGoal] = useState(defaultGoal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/runs", { method: "POST", body: JSON.stringify({ a, b, goal }) });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Could not start the run.");
      setBusy(false);
      return;
    }
    router.push(`/runs/${body.id}`);
  }

  const pick = (value: string, set: (v: string) => void) => (
    <select value={value} onChange={(e) => set(e.target.value)}>
      {founders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="form">
      <div className="pair">
        <label>Founder A {pick(a, setA)}</label>
        <label>Founder B {pick(b, setB)}</label>
      </div>
      <label>
        Goal
        <textarea rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button onClick={start} disabled={busy || a === b}>
        {busy ? "Starting..." : "Let the twins talk"}
      </button>
    </div>
  );
}
