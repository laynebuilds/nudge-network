# Front-end handoff

The backend is done and live. The front-end is yours to redesign.

&nbsp;

## What it is

- Two people's digital twins negotiate a goal, then both humans accept, reject or modify the result.
- The centre: a sealed intent per person (red lines + honest answers) scores whether each twin really acted like its owner.

&nbsp;

## Where it lives

- Live: https://nudge-network.vercel.app
- UI is in `app/`, everything else in `lib/`.
- Local: `npm install`, then `npm run dev`. With no `FOUNDER_TOKENS` set you are signed in as admin, no link needed.

&nbsp;

## Sign-in

- Each person opens a private link, `/join/<token>`. It sets an httpOnly cookie and redirects to `/me`.
- Every API call after that works off the cookie. Scripts send the token as `Authorization: Bearer <token>`.

&nbsp;

## API you build against

All JSON. Shapes live in `lib/schemas.ts` and `lib/runs.ts` (`RunView`).

| Call | Does |
| --- | --- |
| `GET /api/me` | Your twin: name, bio, history items |
| `PUT /api/me` | Save name and public bio |
| `POST /api/me/items` | Add notes or a Nudge export |
| `POST /api/me/whatsapp` | Import a WhatsApp export (text) |
| `POST /api/me/photos` | Up to 8 JPEGs (base64), returns captions. Images not stored |
| `GET`, `PUT /api/me/sealed` | Your sealed intent |
| `GET`, `POST /api/runs` | List runs, start one (`a`, `b`, `goal`) |
| `GET /api/runs/:id` | Run, already filtered for the viewer |
| `POST /api/runs/:id/step` | Advance one step |
| `POST /api/runs/:id/decision` | Accept, reject or modify |

&nbsp;

## The run page must keep doing two things

- While a run is not `done`, keep calling `POST /api/runs/:id/step` in a loop. The open page is what moves the negotiation forward (one model call per step, about 20 to 60 seconds each).
- Show only what the API returns. It already hides the other person's reasoning and scorecard until both have decided (`full: false`).

Stages in order: `negotiating`, `mediating`, `ratifying`, `scoring`, `done` (or `error`).

&nbsp;

## Current pages, free to redesign

- `/` start a run, list of runs
- `/me` your twin: photos, WhatsApp, iMessage instructions, history, sealed intent
- `/runs/:id` conversation, proposal, scorecard, accept / reject / modify

&nbsp;

## Keep

- Sealed intent is never shown to anyone but its owner.
- Photos are resized in the browser before upload (see `toJpeg` in `app/me/page.tsx`); only captions are stored.
- No emoji, no em dashes in copy.
