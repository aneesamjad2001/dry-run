# Dry Run: project context

Read README.md first. It covers the core task, the engine and the data access model.

## Hard rules
- Keys only in `.env.local` / Vercel env vars. Never read `.env*` (denied in `.claude/settings.json`). The author writes that file.
- The browser never talks to Supabase. All data goes through `lib/data.ts` on the server. Every function there returns only what the caller may see: never another person's `clone` or `answers`, and `contact` only when both said yes.
- RLS stays ON with no policies on every table. Schema changes are new files in `supabase/migrations/`.
- Each clone call sees only its own profile; the judge sees only the transcript. Keep it that way: it is the privacy model.
- `lib/engine.ts` must stay free of Next-only imports (it runs from `scripts/eval.ts` under plain Node).
- Free tiers only. Run `/security-review` before shipping.

## Product direction (from TA feedback, Nov 2026)
- Dry Run is the step **between matching and meeting**: you invite a match you already have. No pool to browse (this solves cold start).
- Warm and human, not techie: copy about people, clashes framed as "worth talking about", never a score.
- A few features done very well beat many half-built ones.
