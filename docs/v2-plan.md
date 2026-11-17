# Dry Run: plan for v2 (fair, Dec 1)

v1 does the core task end to end: build your clone, invite a match (or try a demo
person), watch the two clones on a first date, read "Before you meet…", and swap
contacts if you both say yes. This plan starts from what we saw when v1 was used: by
real testers, by the eval, by an end-to-end browser test, and by an independent
security review.

## What we saw

### Real users (Nov 17)
<!-- Fill in from docs/user-testing.md: what each person DID and SAID, and where they got stuck. -->
- **Me, as a new user (Nov 17, dry run with demo Nora).** The flow worked end to end, and
  the clones held their own lives (my 6am runs vs her slow mornings and reading). Four
  things went wrong:
  1. **The biggest miss:** my clone said "i'm looking for friends", but Nora wants
     "something serious and slow-burn". The report listed this as a *match* ("you both
     appreciate taking things slowly"). Agreeing on pace hid a mismatch in what we each want.
  2. **Thin evidence:** "you both like reading" was backed by Nora asking "do you like
     reading much?". A question isn't evidence.
  3. **My clone summary called me "he".** It guessed my pronouns from my name. Summaries now
     speak to you directly ("You wake up at 6am…") and never guess pronouns.
  4. **My clone repeated my interview answer word for word** ("friends to spend great time
     together"). It reads like a form, not a person.
  Fixes 1–3 shipped as prompt changes at 5:25 PM. They aren't in the eval yet, so
  re-running the eval is the first v2 task.
- Tester 2: (classmates, in class Nov 17)
- Tester 3:

### The eval (10 planted-dealbreaker pairs, `npm run eval`)
Final run on the submitted code: **mismatch detection 10/10, honest disagreement 10/10**
(targets 80% and 70%). Across all of today's runs, including those before the prompt
fixes, 21 of 25 dates named the planted clash.

- **Honest disagreement: 100%** (target 70%). The core AI risk from the proposal, clones
  that agree with everything, isn't happening. In the money pair, Alex's clone said
  "a $300 weekend trip would be my whole month" and Sam's said "i'd do the $300 trip and
  eat ramen for a week after". Neither caved.
- **Mismatch detection** passes, but **politics is flaky**: it missed in 2 of its 3 earlier
  runs. The clones argue about a housing ordinance, yet the person whose position *is* an
  identity ("proud conservative") rarely says it, so the report can't name it.
- Reading transcripts beat reading scores. It found clones writing other people's lines,
  stage directions, a director that hinted at a private dealbreaker, and generic
  conversation starters. All four are fixed, with tests from the real outputs.
- A fix can cause a regression. Making the director neutral (for privacy) made dates too
  easy to dodge: Maya said "i don't really do smoke" instead of naming her dealbreaker. We
  caught it with the eval and fixed the prompts.

### Walking through it as a new person (Playwright, two test students)
- The whole flow works in ~3.5 minutes. A dry run takes **50–80 seconds**.
- The report heading "Why you should meet" read as dishonest above a real mismatch. It now
  says "Before you meet Sam".

### Security review (independent agent, whole repo)
- No cross-user data access, no secrets in the client, RLS holds.
- Fixed in v1: names that crashed dates (`C++`) or could hang the server; "want to meet"
  answers that leaked to someone who said no; unlimited model spend through parallel
  requests and a resettable daily cap; an open redirect.
- Open: prompt injection through interview answers (first mitigation only), forwarded
  invite links, Clerk API calls on every request.

### TA feedback on the proposal
- Lauren: make the difference from a compatibility quiz obvious, and solve cold start.
  v1 answers both with **invite your match** (no pool to fill) and the landing page's
  "Why not just a compatibility quiz?". v2 should *show* it at the fair.
- Ariel: the emotional and human layer, and a few features done very well.

## v2: fix first

1. **The fair will break the free tier.** Each model allows 5 requests/minute, and a dry
   run is 14 calls. Ten people at a table at once will stall. Options: more free models
   in the rotation, fewer clone turns (6 → 4 per scene), or one paid top-up with a hard
   budget for fair day only. Decide after load-testing 5 simultaneous dry runs.
2. **Identity clashes (politics, religion).** Prompt clones to state identity-level
   positions when the topic comes up, add 10 more pairs (20 total, as planned in the
   proposal), and re-run until mismatch detection holds at ≥ 80% *including* politics.
3. **Prompt-injection leak check.** After each clone or director step, reject output that
   repeats 8+ words of the *other* person's private profile. Snapshot both profiles when
   a date starts.
4. **Whatever the testers got stuck on** (see above). This outranks everything except #1.

## v2: add

1. **Fidelity check, made visible.** Ask "does this sound like you?" after the date too
   (1–5), and run the proposal's friends-guess-the-clone test. This is the evidence that
   the clone is *you*, which is the claim the whole product rests on.
2. **"Did you meet?" follow-up**, to start measuring the proposal's 30% conversion target.
3. **Fair demo mode:** a dry run between two volunteers at the table, live on screen.
   It shows the difference from a quiz better than any slide.
4. **Human layer (Ariel):** optional profile photos on the invite page only, where a real
   person is deciding whether to trust a link.

## v2: wait

Friend nominations, other schools, messaging inside the app, voice, and monetisation.
All are real ideas, but none would make the fair demo better.

## Beyond the class: what would have to be true for a company

- **Clones must feel like you.** If people don't recognise themselves in their clone, the
  rest fails. We measure this with the "does this sound like you?" score and the
  friends-guess test (v2 add #1).
- **Invites must spread.** Every dry run starts with one person inviting another, so
  growth is built into the core task rather than needing a pool of strangers. The numbers
  to watch are invites sent per clone and the share of invites accepted. If each new
  person brings in at least one more, a campus fills itself.
- **The report must change what people do.** The proposal targets 30% of matched pairs
  actually meeting. The "Did you meet?" follow-up (v2 add #2) is the first real
  measurement.
- **Each dry run must be cheap.** A run is 14 small model calls. We'll measure the real
  cost per run from AI Gateway logs before the fair, because that number decides the
  pricing.
- **Trust is the product.** Private answers never reach the other person, and only the
  report is shared. A leak would end the company, which is why the prompt-injection
  check is in "fix first".
