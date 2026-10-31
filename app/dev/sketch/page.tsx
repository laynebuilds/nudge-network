import type { Metadata } from "next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = { title: "Sketch fields", robots: { index: false } };

export default function SketchDemoPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px 96px", display: "grid", gap: 40 }}>
      <header>
        <span className="eyebrow">Dev</span>
        <h1 style={{ margin: 0 }}>Sketch fields</h1>
      </header>

      <section style={{ display: "grid", gap: 20 }}>
        <h3 style={{ margin: 0 }}>Default</h3>
        <Input label="Your name" placeholder="Ada Lovelace" />
        <Textarea label="Public bio" placeholder="A few lines about you" />
      </section>

      <section style={{ display: "grid", gap: 20 }}>
        <h3 style={{ margin: 0 }}>Error</h3>
        <Input label="Email" type="email" defaultValue="not-an-email" errorMessage="Enter a valid email address." />
        <Textarea label="Goal" defaultValue="" invalid errorMessage="Say what you want the twins to agree on." />
      </section>

      <section style={{ display: "grid", gap: 20 }}>
        <h3 style={{ margin: 0 }}>Disabled</h3>
        <Input label="Locked field" defaultValue="Read only for now" disabled />
        <Textarea label="Locked notes" defaultValue="Nothing to change here." disabled rows={3} />
      </section>

      <section style={{ display: "grid", gap: 20 }}>
        <h3 style={{ margin: 0 }}>Sizes</h3>
        <Input size="sm" placeholder="Small" />
        <Input size="md" placeholder="Medium" />
        <Input size="lg" placeholder="Large" />
      </section>

      <section style={{ display: "grid", gap: 20, background: "#17141c", color: "#ecebe7", borderRadius: 20, padding: 24 }}>
        <h3 style={{ margin: 0, color: "inherit" }}>On a dark surface</h3>
        <Input label="Name" sketchColor="#ecebe7" placeholder="Light ink via sketchColor" />
        <Textarea label="Notes" sketchColor="#ecebe7" rows={3} />
      </section>
    </main>
  );
}
