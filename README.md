# Dry Run

**A first date before the first date.** You matched with someone, but the chat is going
nowhere. Send them a Dry Run link: your AI clones go on a first date, and you both get a
real reason to meet. You see where you click, where you'd clash, and three things to ask
each other. If you both say yes, you swap contacts.

Design, Build, Ship (MPCS 51238), Autumn 2026 · Anees Amjad · Focus: **AI**

**Live:** https://dry-run-eta.vercel.app (sign in with a @uchicago.edu email)

## The core task (v1)

1. Sign in with a UChicago email.
2. Build your clone in about 5 minutes: quick facts you tap (smoking, food, pets…), questions in your own words (typed or spoken), and up to three follow-ups written for you. Then "Does this sound like you?"
3. Invite your match with a link, or try a demo person first.
4. Watch the two clones on a first date, live.
5. Read "Before you meet…": where you click, what's worth talking about, what's still to find out, questions to ask. No score.
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

**Clones don't guess.** A clone only says what its person told it. Quick facts make the
common dealbreaker topics certain, each clone asks about its own dealbreakers early, and
every turn carries a private note listing what its profile is silent on. Asked about one
of those, it says "ask me in person", and the judge lists it under "Still to find out"
instead of counting it as a match. (This came from TA feedback on v1: a clone said "I have
a dog" when its person had only said a partner must love dogs.)

Each clone is a separate call, so neither can read the other's profile. The judge only
sees what both people can watch anyway, so the report can't leak a private profile.

### Evals

```
npm run eval            # all 10 test pairs
npm run eval -- kids    # one pair
```

`scripts/pairs.ts` has 11 pairs, each with one planted dealbreaker (smoking, money, kids,
faith, location, …). The eval scores the proposal's targets, plus one added in v2:

- **Mismatch detection:** the report names the planted clash (target 80%)
- **Honest disagreement:** both clones held their positions in scene 2 (target 70%)
- **No made-up facts:** neither clone claimed something about its person that the profile doesn't say

Latest full run (Nov 17, v1, free-tier models): **10/10 and 10/10**. The v2 prompts have
only been run on two pairs so far (Nov 23); a full run is still to do. Politics is the flaky pair;
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
