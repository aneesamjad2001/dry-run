"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FACTS, MAX_ANSWER, MIN_ANSWER, QUESTIONS, type FactChoices } from "@/lib/questions";
import type { CloneProfile, FollowUp } from "@/lib/engine";
import { Dictate } from "./Dictate";

type Basics = { name: string; year: string; bio: string; contact: string };

// The steps, in order: about you, quick facts (taps), the questions in your own words,
// then up to three follow-ups written for this person once the questions are done.
const FACTS_STEP = 1;
const FIRST_Q = 2;

export function Interview({ initial, next, isRedo }: { initial: Basics & { answers: string[]; facts: FactChoices }; next: string | null; isRedo: boolean }) {
  const router = useRouter();
  const [basics, setBasics] = useState<Basics>({ name: initial.name, year: initial.year, bio: initial.bio, contact: initial.contact });
  const [answers, setAnswers] = useState<string[]>(initial.answers);
  const [facts, setFacts] = useState<FactChoices>(initial.facts);
  // null = not asked yet. Asked once the typed questions are done.
  const [followUps, setFollowUps] = useState<(FollowUp & { answer: string })[] | null>(null);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"asking" | "thinking" | "building" | "review">("asking");
  const [clone, setClone] = useState<CloneProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = QUESTIONS.length;
  const qi = step - FIRST_Q; // index into QUESTIONS, when on a typed question
  const fi = step - FIRST_Q - total; // index into followUps, when on a follow-up
  const onQuestion = qi >= 0 && qi < total;
  const onFollowUp = fi >= 0 && !!followUps?.[fi];
  const current = onQuestion ? answers[qi] : onFollowUp ? followUps![fi].answer : "";
  const lastStep = FIRST_Q + total + (followUps?.length ?? 0) - 1;
  const canNext =
    step === 0
      ? basics.name.trim().length > 0 && basics.contact.trim().length > 0
      : onQuestion
        ? current.trim().length >= MIN_ANSWER
        : true; // quick facts and follow-ups can be skipped
  // The bar leaves room for follow-ups before we know how many there are.
  const progress = step / (FIRST_Q + total + (followUps?.length ?? 2));

  const payload = () => ({
    ...basics,
    answers,
    facts,
    followUps: (followUps ?? []).map((f) => ({ question: f.q, answer: f.answer })),
  });

  function setCurrent(text: string) {
    if (onQuestion) setAnswers(answers.map((a, i) => (i === qi ? text : a)));
    else if (onFollowUp) setFollowUps(followUps!.map((f, i) => (i === fi ? { ...f, answer: text } : f)));
  }

  async function build() {
    setPhase("building");
    setError(null);
    try {
      const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setClone(data.clone);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("asking");
    }
  }

  /** Ask for follow-ups. If that fails for any reason, carry on without them. */
  async function askFollowUps() {
    setPhase("thinking");
    setError(null);
    let asked: FollowUp[] = [];
    try {
      const res = await fetch("/api/profile/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const data = await res.json();
      if (res.ok && Array.isArray(data.questions)) asked = data.questions;
    } catch {
      // No follow-ups this time.
    }
    setFollowUps(asked.map((f) => ({ ...f, answer: "" })));
    if (asked.length) {
      setStep(FIRST_Q + total);
      setPhase("asking");
    } else {
      build();
    }
  }

  function goNext() {
    if (!canNext) return;
    if (step === FIRST_Q + total - 1 && followUps === null) askFollowUps();
    else if (step < lastStep) setStep(step + 1);
    else build();
  }

  if (phase === "thinking") {
    return (
      <div className="py-24 text-center" role="status">
        <p className="font-serif text-4xl">Reading what you wrote…</p>
        <p className="mt-3 text-muted">A couple of follow-up questions are on the way, so your clone doesn&apos;t have to guess.</p>
        <p className="typing mt-6 text-accent" aria-hidden>
          <span />
          <span />
          <span />
        </p>
      </div>
    );
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
          {!!clone.facts?.length && (
            <Row label="Knows for sure">
              <ul className="list-disc pl-5">
                {clone.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Row>
          )}
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
        <p className="mt-4 text-sm text-muted">
          Your clone only says what&apos;s here. If your date asks about anything else, it says &ldquo;ask me in person&rdquo; instead of guessing.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={() => router.push(next ?? "/home")}>
            That&apos;s me
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setPhase("asking");
              setFollowUps(null); // changed answers get fresh follow-ups
              setStep(FACTS_STEP);
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
      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-soft" role="progressbar" aria-label="Interview progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} />
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
              About 5 minutes. First the basics, then a few quick taps, then some questions in your own words. Answer like you&apos;re texting a
              friend: your clone will talk the way you write.
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
        ) : step === FACTS_STEP ? (
          <>
            <p className="text-sm font-medium text-accent">The quick ones</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight">A few things a date would ask.</h1>
            <p className="mt-2 text-muted">
              Tap what&apos;s true for you. This is how your clone knows whether you smoke or eat meat instead of guessing, and how it can answer
              someone else&apos;s dealbreakers honestly. Skip any you&apos;d rather keep for the real date.
            </p>
            <div className="mt-8 space-y-6">
              {FACTS.map((f) => (
                <fieldset key={f.id}>
                  <legend className="font-medium">{f.q}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {f.options.map((o) => {
                      const on = facts[f.id] === o.label;
                      return (
                        <button
                          key={o.label}
                          type="button"
                          aria-pressed={on}
                          className={`chip ${on ? "chip-on" : ""}`}
                          onClick={() => {
                            const rest = { ...facts };
                            delete rest[f.id];
                            setFacts(on ? rest : { ...rest, [f.id]: o.label });
                          }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-accent">{onFollowUp ? "One more thing" : "In your own words"}</p>
            <label htmlFor="answer" className="mt-2 block font-serif text-4xl leading-tight">
              {onFollowUp ? followUps![fi].q : QUESTIONS[qi].q}
            </label>
            <p className="mt-2 text-muted">{onFollowUp ? followUps![fi].hint : QUESTIONS[qi].hint}</p>
            <textarea
              id="answer"
              key={step}
              autoFocus
              className="field mt-6 min-h-40"
              maxLength={MAX_ANSWER}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) goNext();
              }}
            />
            <Dictate key={`mic-${step}`} onText={(t) => setCurrent(`${current.trim()} ${t}`.trim().slice(0, MAX_ANSWER))} />
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
            {followUps !== null && step === lastStep ? "Build my clone" : onFollowUp && !current.trim() ? "Skip" : "Next"}
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
