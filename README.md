# Nudge Network

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

## Seed scenario

Two fictional London founders in `data/founders/`:

- **Maya Chen**: ex-Stripe, building Ledgerline (payment rails for AI agents). Needs a commercial cofounder full-time by 15 Jan, will not touch crypto, will not move before July, never wants to be CEO again, will not go below 55%.
- **Jonah Okafor**: Head of SMB Sales at Tide, building Tabby (AP for restaurants) with 6 pilots. Wants CEO and 50/50, will not go below 45%, needs 4k/month within 3 months, will walk from his Feb cliff for the right thing, will not do pure infra.

None of that is stated plainly to the twins. It is scattered across texts with a sibling, an email to an investor, a whiteboard photo with "NO CRYPTO" circled, a calendar block, a budget note. The overlap (55/45, Jonah as CEO, Maya as CTO, restaurant AP agents on Ledgerline rails, Jonah full-time in January) is findable but only if the twins actually read their owners well.

## Run it

```bash
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

From the terminal:

```bash
npm run negotiate                        # Maya x Jonah, full pipeline, saves runs/<id>.json
npm run negotiate -- --a maya --b jonah --goal "Could we share one sales hire?"
npm run eval -- --repeats 3              # probe accuracy only, twin vs bio-only baseline
```

Open `/runs/<id>` and switch between **View as Maya**, **View as Jonah** (each sees only their own twin's private reasoning and their own open questions, and can accept / reject / modify) and **Judges view** (everything plus the fidelity scorecard).

## Real histories with Nudge

[Nudge](https://github.com/jasnoorkaur111/imessage-mcp) already reads iMessage and Apple Mail locally on a Mac. `scripts/ingest-nudge.mjs` uses it to build a founder's history file:

```bash
NUDGE_PATH=~/imessage-mcp npm run ingest:nudge -- --id jas --name "Your Name" --bio "One line public bio" --days 90
```

Needs Node 22.5+ and Full Disk Access for the terminal. Everything stays on the machine, and real histories under `data/founders/` are gitignored (only the two seed founders are committed). Then write `intent.sealed.json` next to it, by hand, without showing it to the twin.

## Layout

```
data/founders/<id>/history.json        owner's digital history (ids are cited by twins)
data/founders/<id>/intent.sealed.json  red lines + probe answers, scorer only
lib/twin.ts         twin prompt, negotiation turn, ratification, probe prediction
lib/negotiate.ts    turn loop, mediator, ratify and revise
lib/fidelity.ts     probe grading, baseline ablation, red line audit, grounding
lib/runs.ts         run lifecycle, persisted to runs/<id>.json
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
