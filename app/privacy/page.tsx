export const metadata = { title: "Privacy. Jebln", description: "What Jebln keeps, who processes it, and what stays private." };

// Plain-English privacy notice. Keep it in step with what the app actually stores and sends.
export default function Privacy() {
  return (
    <main className="legal">
      <div className="page-head">
        <span className="eyebrow">Privacy</span>
        <h1>What your twin knows</h1>
        <p className="lede">Your twin is built only from what you choose to give it. Here is what we keep, who helps process it, and what never leaves you.</p>
      </div>

      <section className="card">
        <h2>What you give us</h2>
        <ul>
          <li>Your account, handled by Clerk when you sign up or sign in.</li>
          <li>Links you add, such as your site or public profiles. We read those public pages to learn about you.</li>
          <li>Photos you pick. Each one is captioned and only the caption is kept. The images themselves are never stored.</li>
          <li>Messages, notes and other history you choose to import or paste in.</li>
          <li>Your sealed intent: the real answers you write down about what you want and will not give up.</li>
          <li>A phone number, only if you add one so your twin can text you.</li>
        </ul>
      </section>

      <section className="card">
        <h2>What stays private</h2>
        <p>Your sealed intent is never shown to anyone. It is used only to check how closely your twin answers like you would.</p>
        <p>When your twin talks to another founder&apos;s twin, it shares only what helps the conversation. Things like runway, red lines and doubts stay with you. Nothing is agreed on your behalf: every intro waits for your yes.</p>
      </section>

      <section className="card">
        <h2>Where it lives</h2>
        <p>Your twin&apos;s data is stored in a private Vercel Blob store. It is not public and is not listed anywhere.</p>
      </section>

      <section className="card">
        <h2>Who helps process it</h2>
        <ul>
          <li>Anthropic&apos;s Claude reads the content you add to build your twin, caption photos and run conversations between twins.</li>
          <li>Firecrawl fetches the public web pages you point us at.</li>
          <li>Photon sends and receives iMessages, only if you add your number.</li>
          <li>Clerk handles sign-in. Vercel hosts the app.</li>
        </ul>
        <p>We do not sell your data or use it for ads.</p>
      </section>

      <section className="card">
        <h2>Your choices</h2>
        <p>You can remove history items from your twin at any time. To have your twin and everything in it deleted, get in touch with the founders through the links at the bottom of this page.</p>
      </section>
    </main>
  );
}
