"use client";

import { use, useState } from "react";
import { useRun } from "../../../../lib/client";
import { Phone } from "../../../../components/twin/LivePhone";

// iMessage-style view of a run: one phone per twin, the same conversation seen from each side.
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { run, error } = useRun(id);
  // On a phone only one side fits; the switch is hidden on wider screens, where both phones show.
  const [shown, setShown] = useState<"a" | "b" | null>(null);

  if (error)
    return (
      <section className="card">
        <p className="error">{error === "Not found" ? "This run does not exist, or it is not one of yours." : error}</p>
        <a className="button-link" href="/">Back to your matches</a>
      </section>
    );
  if (!run) return <p className="muted">Loading...</p>;

  return (
    <div className="chat-page">
      <p className="muted chat-goal">{run.goal}</p>
      <div className="phone-switch" role="tablist">
        {(["a", "b"] as const).map((side) => (
          <button
            key={side}
            role="tab"
            aria-selected={(shown ?? run.party ?? "a") === side}
            className={(shown ?? run.party ?? "a") === side ? "on" : ""}
            onClick={() => setShown(side)}
          >
            {(side === "a" ? run.a : run.b).name.split(" ")[0]}&apos;s twin
          </button>
        ))}
      </div>
      <div className="phones">
        <Phone key={shown ?? run.party ?? "a"} run={run} side={(shown ?? run.party ?? "a") as "a" | "b"} hiddenOnPhone={false} />
      </div>
      <p className="chat-links">
        <a href={`/runs/${run.id}`}>Full run, scorecard and decision</a>
      </p>
    </div>
  );
}
