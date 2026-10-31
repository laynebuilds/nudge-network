# Jebln (Nudge Network)

**Your twin goes first.** Two founders' digital twins meet, negotiate on their own, and come back with a proposal the humans accept, reject, or modify, by replying to an iMessage.

Live: https://nudge-network.vercel.app (invite only) · Watch a run as iMessage: `/runs/<id>/chat`

Each twin is built from its owner's real digital life: their links (LinkedIn, X, Instagram, website), their photo gallery, their messages (iMessage via Nudge, WhatsApp exports), and what the web says about them. The twins talk to each other, ask questions, trade preferences, hold red lines, and hand back a proposal with the reasoning, what each side gains, the constraints they respected, and the questions only a human can answer.

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

## Partners used

| Partner | Where |
| --- | --- |
| **Anthropic** (Claude Opus 5.5) | Every agent: twins, mediator, ratification, scorer, photo captions, profile distillation, and person research via Claude's server-side web search |
| **Photon** (iMessage API) | When the twins find an opportunity, each founder gets an iMessage with the headline, what needs them, and a link. Replying ACCEPT, REJECT or MODIFY records their decision (`lib/photon.ts`, `/api/photon/webhook`) |
| **Firecrawl** | Reads websites and public pages people connect to their twin (`lib/firecrawl.ts`) |

## How a run works

```
research (web) ─> both twins read a sourced brief on the other, including mutual overlaps
history (A) ──> Twin A ─┐                         ┌─> Twin A ratifies ─┐
                        ├─ negotiate (turns) ─> Mediator ─┤                    ├─> proposal ─> founders decide
history (B) ──> Twin B ─┘    public messages only  └─> Twin B ratifies ─┘        (accept / reject / modify)
                                                         objections -> one revision
sealed intent (A, B) ───────────────────────────────────────────────────> fidelity scorecard
```

- **Research** (`lib/research.ts`): two-step person research ported from Orbit (jasnoorkaur111/Orbit-Personal-CRM): connected profile links pin identity, then 5 to 8 specific, sourced signals tagged professional, recent, interest, personal, mutual or context. Namesakes go to a doubts list, never into the brief.
- **Twins** (`lib/twin.ts`) see only their own owner's history. Each turn returns a structured move: message to the other side, private reasoning, evidence ids, per-topic positions (firm / flexible / open), status (continue / ready / walk_away), and questions for the owner.
- **Mediator** (`lib/negotiate.ts`) sees only what the twins said to each other and their declared terms, never either history. It writes the outcome: proposal, reasoning, gains per side, constraints respected, unresolved questions.
- **Ratification**: each twin checks the proposal against its owner. If either objects, the mediator revises once, then the twins check again.
- **Fidelity** (`lib/fidelity.ts`) scores everything against the sealed files.

## Your twin: plug in your life

Each person signs in with a private invite link and builds their twin at `/me` in about two minutes:

1. **Your links.** Paste LinkedIn, X, Instagram and website links in one box. LinkedIn is read from its public profile (including recent posts), X through a public mirror (bio plus up to 80 recent posts and replies), websites through Firecrawl. Claude keeps what each says about you plus your own words verbatim.
2. **Research me on the web.** One click, Orbit-style signals with sources.
3. **Your photos.** Pick 20 to 40 from your phone or Mac, or run `npm run ingest:photos` to read the Apple Photos library directly (favourites and named people first). Claude writes a note per photo; images are never stored.

Optional: ten questions about purpose, values and the next year (the twin weighs these above inference), a "Send to my twin" browser bookmark for pages behind a login (Instagram posts), WhatsApp export upload, iMessage and Apple Mail via [Nudge](https://github.com/jasnoorkaur111/imessage-mcp), free notes, and the sealed answer key for the scorecard.

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

Runs drive themselves on the server: each background call does as many model steps as fit in about 2.5 minutes, then hands off to the next, so a full run finishes with nobody watching. A lease with a conditional Blob write stops double steps, and a watchdog resumes any run that stalls.

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
lib/research.ts     Orbit-style person research with Claude web search
lib/social.ts       LinkedIn and X public readers, distillation
lib/photon.ts       iMessage opportunity texts and reply-to-decide
lib/autorun.ts      self-driving runs and watchdog
app/                Next.js reveal UI and API
scripts/            negotiate and eval CLIs, Nudge ingest
```

## Stack

Next.js 16, TypeScript, Anthropic SDK with `claude-opus-5-5` and structured outputs (Zod). Server-side refusal fallbacks are on (`fallbacks: "default"`). Override the model with `NUDGE_MODEL`.

## What we learned from the first real run (Layne x Jasnoor)

The twins negotiated a sensible Phase 1 (4 to 8 week joint project, 50/50 on joint work, pre-existing IP ring-fenced, either side can walk) without supervision, corrected each other's facts, and flagged hours and investor terms as owner questions instead of guessing. But on the sealed probes they scored 10% against a 30% bio-only baseline: histories full of activity said little about preferences like equity views or available time. That is the eval doing its job, and it is why the twin builder now pulls people's own words (posts, the ten questions) rather than only activity.

## Next

- Twins text their owner over Photon mid-negotiation when history does not answer something, and the answer goes into history.
- Retrieval tool instead of full history in context, for real-sized histories.
- More founder pairs and a leaderboard of probe accuracy and red line violations across runs.
- Live mode: each twin runs on its owner's own machine and only messages cross the wire.

## Team

- Layne Singh ([@laynebuilds](https://github.com/laynebuilds))
- Jasnoor Kaur ([@jasnoorkaur111](https://github.com/jasnoorkaur111)), author of [Nudge](https://github.com/jasnoorkaur111/imessage-mcp), which powers real-history ingest
