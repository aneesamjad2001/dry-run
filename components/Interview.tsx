"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_ANSWER, MIN_ANSWER, QUESTIONS } from "@/lib/questions";
import type { CloneProfile } from "@/lib/engine";

type Basics = { name: string; year: string; bio: string; contact: string };

export function Interview({ initial, next, isRedo }: { initial: Basics & { answers: string[] }; next: string | null; isRedo: boolean }) {
  const router = useRouter();
  const [basics, setBasics] = useState<Basics>({ name: initial.name, year: initial.year, bio: initial.bio, contact: initial.contact });
  const [answers, setAnswers] = useState<string[]>(initial.answers);
  // 0 = about you, 1..N = questions, then building, then review
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"asking" | "building" | "review">("asking");
  const [clone, setClone] = useState<CloneProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = QUESTIONS.length;
  const qi = step - 1;
  const current = qi >= 0 ? answers[qi] : "";
  const canNext = step === 0 ? basics.name.trim().length > 0 && basics.contact.trim().length > 0 : current.trim().length >= MIN_ANSWER;

  async function build() {
    setPhase("building");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basics, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setClone(data.clone);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("asking");
    }
  }

  function goNext() {
    if (!canNext) return;
    if (step < total) setStep(step + 1);
    else build();
  }

  if (phase === "building") {
    return (
      <div className="py-24 text-center" role="status">
        <p className="font-serif text-4xl">Getting to know you…</p>
        <p className="mt-3 text-muted">Your clone is reading your answers. About 20 seconds.</p>
        <p className="typing mt-6 text-accent" aria-hidden>
          <span />
          <span />
          <span />
        </p>
      </div>
    );
  }

  if (phase === "review" && clone) {
    return (
      <div className="py-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Your clone</p>
        <h1 className="mt-1 font-serif text-5xl leading-tight">Does this sound like you?</h1>
        <p className="mt-3 text-muted">Only your clone uses this. Nobody else ever sees it, including the people you go on dry runs with.</p>
        <div className="mt-6 space-y-5 rounded-2xl border border-line bg-card p-6 shadow-card">
          <p className="text-lg">{clone.summary}</p>
          <Row label="Looking for">{clone.looking_for}</Row>
          <Row label="Cares about">{clone.values.join(" · ")}</Row>
          <Row label="Won't budge on">
            <ul className="list-disc pl-5">
              {clone.dealbreakers.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </Row>
          <Row label="In a disagreement">{clone.conflict_style}</Row>
          <Row label="Sounds like">
            <div className="flex flex-wrap gap-2">
              {clone.sample_lines.map((l) => (
                <span key={l} className="rounded-2xl rounded-br-sm bg-me-soft px-3 py-1.5 text-[15px]">
                  {l}
                </span>
              ))}
            </div>
          </Row>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={() => router.push(next ?? "/home")}>
            That&apos;s me
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setPhase("asking");
              setStep(1);
            }}
          >
            Change my answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="mb-8 flex items-center gap-3" aria-hidden>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(step / (total + 1)) * 100}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted">
          {step + 1} / {total + 1}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
      >
        {step === 0 ? (
          <>
            <h1 className="font-serif text-5xl leading-tight">{isRedo ? "Update your clone" : "Let's build your clone"}</h1>
            <p className="mt-3 text-muted">
              {total} short questions, about 5 minutes. Answer like you&apos;re texting a friend: your clone will talk the way you write.
            </p>
            <div className="mt-8 space-y-5">
              <Field label="First name" hint="What your dates will call you.">
                <input className="field" value={basics.name} maxLength={40} autoComplete="given-name" required
                  onChange={(e) => setBasics({ ...basics, name: e.target.value })} />
              </Field>
              <Field label="Year and major" hint="Optional. e.g. Third-year · Economics">
                <input className="field" value={basics.year} maxLength={60}
                  onChange={(e) => setBasics({ ...basics, year: e.target.value })} />
              </Field>
              <Field label="One line about you" hint="Optional. Shown to the people you invite.">
                <input className="field" value={basics.bio} maxLength={160}
                  onChange={(e) => setBasics({ ...basics, bio: e.target.value })} />
              </Field>
              <Field label="How should a match reach you?" hint="Instagram, phone, or email. Only shown if you BOTH say you want to meet.">
                <input className="field" value={basics.contact} maxLength={120} required
                  onChange={(e) => setBasics({ ...basics, contact: e.target.value })} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-accent">Question {step} of {total}</p>
            <label htmlFor="answer" className="mt-2 block font-serif text-4xl leading-tight">
              {QUESTIONS[qi].q}
            </label>
            <p className="mt-2 text-muted">{QUESTIONS[qi].hint}</p>
            <textarea
              id="answer"
              key={qi}
              autoFocus
              className="field mt-6 min-h-40"
              maxLength={MAX_ANSWER}
              value={current}
              onChange={(e) => setAnswers(answers.map((a, i) => (i === qi ? e.target.value : a)))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) goNext();
              }}
            />
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-warn">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary" disabled={!canNext}>
            {step === total ? "Build my clone" : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-medium">{label}</span>
      <span className="mb-2 block text-sm text-muted">{hint}</span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr] sm:gap-4">
      <div className="text-sm font-medium text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}
