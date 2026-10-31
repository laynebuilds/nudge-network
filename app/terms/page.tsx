export const metadata = { title: "Terms. Jebln", description: "The short version of how Jebln works and what we ask of you." };

// Plain-English terms. Short on purpose; see /privacy for what is stored.
export default function Terms() {
  return (
    <main className="legal">
      <div className="page-head">
        <span className="eyebrow">Terms</span>
        <h1>The short version</h1>
        <p className="lede">Jebln is an early product for founders. By using it you agree to the following.</p>
      </div>

      <section className="card">
        <h2>What Jebln does</h2>
        <p>Jebln builds an AI twin of you from the links, photos and messages you choose to add. Your twin talks to other founders&apos; twins and brings back proposals. It never agrees to anything for you. Every intro and every term waits for your yes.</p>
      </section>

      <section className="card">
        <h2>What we ask of you</h2>
        <ul>
          <li>Only add content that is yours to share, and do not import other people&apos;s private data without their permission.</li>
          <li>Be honest in your sealed intent. It is how we check that your twin acts like you.</li>
          <li>Do not use Jebln to spam, harass or mislead other founders.</li>
        </ul>
      </section>

      <section className="card">
        <h2>What to expect from us</h2>
        <p>Twins are AI and can be wrong. Treat what a twin says as a starting point, not a promise, and check anything important before you rely on it. Jebln is offered as is while we build it, and features may change or go away.</p>
      </section>

      <section className="card">
        <h2>Leaving</h2>
        <p>You can stop using Jebln at any time. See <a href="/privacy">Privacy</a> for how to have your data deleted.</p>
      </section>
    </main>
  );
}
