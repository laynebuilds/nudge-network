# Jebln

Two founders' digital twins meet, negotiate, and come back with a proposal the humans can accept, reject, or modify.

Each twin is built from its owner's real digital history (iMessage, email, calendar, photo captions, notes, docs). The twins talk to each other, ask questions, trade preferences, hold red lines, and hand back a proposal with the reasoning, what each side gains, the constraints they respected, and the questions only a human can answer.

## The question at the centre

**Do these agents understand their owners well enough to make decisions their owners would actually make?**

Everything in the repo is built to answer that with numbers, not vibes:

1. **Sealed intent.** Before a run, each founder writes `intent.sealed.json`: their red lines plus probe questions with their own answers ("lowest equity you'd take?", "would you move to SF in 6 months?"). No agent ever sees this file. It is only opened by the scorer after the negotiation ends.
2. **Probe accuracy.** Each twin predicts its owner's answers to the sealed probes. A grader compares them with the real answers.
3. **History ablation.** The same model predicts the same probes from the public bio only. The gap between twin and baseline is how much the digital history is doing. (Seed data today: Maya twin 100% vs baseline 25%, Jonah twin 75% vs baseline 50%.)
4. **Red line audit.** The final proposal is checked against both founders' sealed red lines. A twin that gave away something its owner never would is a failure even if a deal was reached.
5. **Grounding.** Every twin turn must cite history item ids. The scorer checks that citations resolve to real items.
6. **The human call.** Founders accept, reject, or modify. That decision is the final ground truth and is stored with the run.

A clean "no fit" counts as success when it is the honest answer. The twins are told that a deal is not the goal; a deal their owner would sign is.

## How a run works

```
history (A) ──> Twin A ─┐                         ┌─> Twin A ratifies ─┐
                        ├─ negotiate (turns) ─> Mediator ─┤                    ├─> proposal ─> founders decide
history (B) ──> Twin B ─┘    public messages only  └─> Twin B ratifies ─┘        (accept / reject / modify)
                                                         objections -> one revision
sealed intent (A, B) ───────────────────────────────────────────────────> fidelity scorecard
```

- **Twins** (`lib/twin.ts`) see only their own owner's history. Each turn returns a structured move: message to the other side, private reasoning, evidence ids, per-topic positions (firm / flexible / open), status (continue / ready / walk_away), and questions for the owner.
- **Mediator** (`lib/negotiate.ts`) sees only what the twins said to each other and their declared terms, never either history. It writes the outcome: proposal, reasoning, gains per side, constraints respected, unresolved questions.
- **Ratification**: each twin checks the proposal against its owner. If either objects, the mediator revises once, then the twins check again.
- **Fidelity** (`lib/fidelity.ts`) scores everything against the sealed files.

## Your twin: plug in your life

Each person signs in with a private invite link and builds their twin at `/me`:

- **Messaging.** WhatsApp: Export chat (without media), upload the .zip or .txt. iMessage and Apple Mail on a Mac: [Nudge](https://github.com/jasnoorkaur111/imessage-mcp) reads them locally, you review the file, then upload only what you keep.
- **Photo gallery.** Pick photos from your phone or Mac. They are resized in the browser, Claude writes a short note on what each one says about your life (places, work, routines, people by relationship), and only the notes are kept. Images are never stored.
- **Notes.** Paste anything else: a thread, a plan, a decision you made.
- **Sealed intent.** Your red lines and your honest answers to probe questions. Only you see it; it is how the scorecard checks your twin.

Real histories never go in git. They live in a private Vercel Blob store. `data/founders/` holds only public facts and the demo pair.

Privacy in a run: until both people have decided, each sees only their own twin's private reasoning, their own open questions and their own scorecard. Everything opens up once both have decided.

## Demo pair

Two fictional London founders, Maya (technical, agent payments, ex-Stripe) and Jonah (sales, restaurant accounts payable), with constraints scattered across texts, emails, a whiteboard photo and calendars. On the first full run the twins found 55/45, Jonah CEO and Maya CTO, fiat only and a 15 January start. Results: 0 red line violations, 88% probe accuracy vs a 38% bio-only baseline, 100% of citations resolving.

## Run it

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY; FOUNDER_TOKENS and BLOB_READ_WRITE_TOKEN for the hosted setup
npm run dev                  # http://localhost:3000 (no FOUNDER_TOKENS = local admin, no sign-in)
npm run negotiate                        # demo pair, full pipeline in the terminal
npm run negotiate -- --a layne --b jasnoor
npm run eval -- --repeats 3              # probe accuracy only, twin vs bio-only baseline
npm run ingest:nudge -- --id layne --contacts "Jasnoor" --days 90
NUDGE_TOKEN=... npm run upload -- --file .data/ingest/layne.json --url https://<deployment>
```

Runs advance one model step per request (the open run page drives them), so nothing hits serverless time limits. A lease with a conditional Blob write stops two viewers from stepping the same run at once.

## Layout

```
data/founders/<id>/history.json        owner's digital history (ids are cited by twins)
data/founders/<id>/intent.sealed.json  red lines + probe answers, scorer only
lib/twin.ts         twin prompt, negotiation turn, ratification, probe prediction
lib/negotiate.ts    turn loop, mediator, ratify and revise
lib/fidelity.ts     probe grading, baseline ablation, red line audit, grounding
lib/runs.ts         run lifecycle, stepping, per-viewer redaction
lib/store.ts        private Vercel Blob (or .data/ locally)
lib/auth.ts         invite-link sign-in
lib/whatsapp.ts     WhatsApp export parser
app/                Next.js reveal UI and API
scripts/            negotiate and eval CLIs, Nudge ingest
```

## Stack

Next.js 16, TypeScript, Anthropic SDK with `claude-opus-5-5` and structured outputs (Zod). Server-side refusal fallbacks are on (`fallbacks: "default"`). Override the model with `NUDGE_MODEL`.

## Next

- Retrieval tool instead of full history in context, for real-sized histories.
- Photo ingest (captions via vision) and calendar ingest.
- More founder pairs and a leaderboard of probe accuracy and red line violations across runs.
- Live mode: each twin runs on its owner's own machine and only messages cross the wire.

## Team

- Layne Singh ([@laynebuilds](https://github.com/laynebuilds))
- Jasnoor Kaur ([@jasnoorkaur111](https://github.com/jasnoorkaur111)), author of [Nudge](https://github.com/jasnoorkaur111/imessage-mcp), which powers real-history ingest
