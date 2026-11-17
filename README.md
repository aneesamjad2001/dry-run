# Dry Run

**A first date before the first date.** You matched with someone, but the chat is going
nowhere. Send them a Dry Run link: your AI clones go on a first date, and you both get a
real reason to meet. You see where you click, where you'd clash, and three things to ask
each other. If you both say yes, you swap contacts.

Design, Build, Ship (MPCS 51238), Autumn 2026 · Anees Amjad · Focus: **AI**

## The core task (v1)

1. Sign in with a UChicago email.
2. Build your clone: 8 questions, then "Does this sound like you?"
3. Invite your match with a link, or try a demo person first.
4. Watch the two clones on a coffee date, live.
5. Read "Why you two should meet": where you click, what's worth talking about, questions to ask. No score.
6. "Want to meet?" If you both say yes, you see each other's contact.

## How the AI works (`lib/engine.ts`)

A dry run is a fixed schedule of 14 steps. Each step is one model call, so the browser asks
for the next step, shows it, and asks again. That gives a live view with no long requests.

| Step | Who | Model | Sees |
|---|---|---|---|
| 0–5 | Scene 1: small talk, clones alternate | clone model | **its own** private profile + the conversation |
| 6 | Director writes a situation aimed at their biggest real difference | smart model | both profiles, writes only a neutral situation |
| 7–12 | Scene 2: the clones respond and hold their positions | clone model | its own profile + the conversation |
| 13 | Judge writes the report: aligned, clashes, 3 starters, no score | smart model | **only the transcript** |

All calls go through Vercel AI Gateway with the AI SDK, so the models are settings, not
code: `DRYRUN_CLONE_MODEL` (fast, many short turns) and `DRYRUN_SMART_MODEL` (building the
clone, director, judge). `npm run check` tests a model pair in a few calls.

Each clone is a separate call, so neither can read the other's profile. The judge only
sees what both people can watch anyway, so the report can't leak a private profile.

### Evals

```
npm run eval            # all 10 test pairs
npm run eval -- kids    # one pair
```

`scripts/pairs.ts` has 10 pairs, each with one planted dealbreaker (smoking, money, kids,
faith, location, …). The eval scores the proposal's targets:

- **Mismatch detection:** the report names the planted clash (target 80%)
- **Honest disagreement:** both clones held their positions in scene 2 (target 70%)

Latest full run (Nov 17, free-tier models): **10/10 and 10/10**. Politics is the flaky pair;
see [docs/v2-plan.md](docs/v2-plan.md).

`npm run e2e` runs the whole core task in a real browser as two new test students
(Clerk test users, real model calls, ~3.5 minutes).

## v1 → v2

- [docs/v2-plan.md](docs/v2-plan.md): what we saw when v1 was used, and what v2 changes.
- [docs/user-testing.md](docs/user-testing.md): the user-test script and notes.

## Stack

Next.js 16 on Vercel · Clerk (UChicago emails only) · Supabase Postgres · AI SDK + Vercel AI Gateway (free monthly credit).

**Data access:** the browser never talks to Supabase. Every read and write goes through
server routes that check the Clerk session and use the secret key. Row-level security is
on for every table with no policies, so the public key can read nothing. Private clone
profiles and contact info never reach another person's browser.

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. In the Supabase SQL editor, run the files in `supabase/migrations/` in order.
4. `npm run dev`, then open http://localhost:3000

`npm test` runs the unit tests (no API calls).

## Safety and cost

- Keys live in env vars only; `.env*` is git-ignored, and agents are denied reading it (`.claude/settings.json`).
- Each person can start at most 8 dry runs per 24 hours.
- Models run on AI Gateway's free monthly credit (free-tier models only; buying credits would move the team to the paid tier).
