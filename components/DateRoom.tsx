"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, DemoTag } from "./Avatar";
import type { DateView } from "@/lib/data";

// The live view. While the date is running, this page asks the server for one step at
// a time and shows each line as it arrives. Either person's open tab can drive it; the
// server makes sure each step only runs once.

const MIN_GAP_MS = 1100; // so lines arrive at a readable, texting-like pace

export function DateRoom({ initial }: { initial: DateView }) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pause, setPause] = useState<string | null>(null); // busy models: waiting, will carry on
  const [runId, setRunId] = useState(0); // bump to retry after an error
  const bottom = useRef<HTMLDivElement>(null);
  const them = view.them?.name ?? view.inviteeLabel ?? "your match";

  // Drive the date, one step per request.
  useEffect(() => {
    if (view.status !== "running") return;
    let cancelled = false;
    (async () => {
      while (!cancelled) {
        const started = Date.now();
        let res: Response;
        try {
          res = await fetch(`/api/dates/${view.id}/step`, { method: "POST" });
        } catch {
          // Network dropped. Show the error so the "Try again" button can restart the loop.
          if (!cancelled) setError("Lost connection. Check your internet and try again.");
          return;
        }
        const data = await res.json().catch(() => ({ error: "Lost connection." }));
        if (cancelled) return;
        if (res.status === 429 && data.retryAfter) {
          // Free-tier models are busy. Wait and carry on by ourselves; this isn't an error.
          setPause(data.error);
          await new Promise((r) => setTimeout(r, data.retryAfter * 1000));
          setPause(null);
          continue;
        }
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        const wait = MIN_GAP_MS - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        setView(data as DateView);
        if ((data as DateView).status !== "running") return;
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-run only when we (re)start a run, not on every view update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.id, view.status === "running", runId]);

  // Poll while waiting on the other person (to accept the invite, or to answer "want to meet?").
  const waiting =
    view.status === "invited" || (view.status === "done" && view.myMeet === true && view.theirMeet === null && !view.them?.isDemo);
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/dates/${view.id}`);
    if (res.ok) setView(await res.json());
  }, [view.id]);
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [waiting, refresh]);

  useEffect(() => {
    if (view.status === "running") bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [view.events.length, view.status]);

  return (
    <div className="mx-auto max-w-xl py-4">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-3">
          <Avatar name={view.meName} />
          <Avatar name={them} />
        </div>
        <div>
          <p className="font-semibold">
            You &amp; {them}
            {view.them?.isDemo && <DemoTag />}
          </p>
          <p className="text-sm text-muted">{statusLine(view, them)}</p>
        </div>
      </div>

      {view.status === "invited" && <Waiting view={view} them={them} />}
      {view.status === "declined" && (
        <Card>
          <p>{them} passed on this one. That&apos;s okay, it happens.</p>
          <Link href="/home" className="btn btn-ghost mt-4">
            Back to my dry runs
          </Link>
        </Card>
      )}

      {view.events.length > 0 && (
        <div className="mt-6 space-y-2" aria-live="polite">
          {view.events.map((e, i) =>
            e.who === "director" ? (
              <p key={i} className="pop py-3 text-center text-sm text-muted">
                <span className="inline-block rounded-2xl bg-soft px-4 py-2">{e.text}</span>
              </p>
            ) : (
              <Bubble key={i} mine={e.who === "me"} label={e.who === "me" ? "Your clone" : `${them}'s clone`}>
                {e.text}
              </Bubble>
            ),
          )}
          {view.status === "running" && !error && <Typing view={view} them={them} />}
          {pause && (
            <p className="text-center text-sm text-muted" role="status">
              {pause}
            </p>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-warn">
          <p>{error}</p>
          <button
            className="btn btn-ghost mt-3"
            onClick={() => {
              setError(null);
              setRunId((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}

      {view.report && <ReportCard view={view} them={them} />}
      {view.report && <Meet view={view} them={them} onChange={setView} />}
      <div ref={bottom} />
    </div>
  );
}

function statusLine(v: DateView, them: string) {
  if (v.status === "invited") return `Waiting for ${them} to accept`;
  if (v.status === "declined") return "Not this time";
  if (v.status === "running") {
    const scene = v.step <= 6 ? 1 : 2;
    return v.nextUp === "judge" ? "Writing your report…" : `On the date · scene ${scene} of 2`;
  }
  return "The date's over";
}

function Bubble({ mine, label, children }: { mine: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className={`pop flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? "rounded-br-sm bg-me-soft" : "rounded-bl-sm bg-accent-soft"}`}>
        <span className={`block text-xs font-semibold ${mine ? "text-me" : "text-accent"}`}>{label}</span>
        <span className="text-[15px] leading-snug">{children}</span>
      </div>
    </div>
  );
}

function Typing({ view, them }: { view: DateView; them: string }) {
  if (view.nextUp === "director" || view.nextUp === "judge") {
    return (
      <p className="py-3 text-center text-sm text-muted" role="status">
        {view.nextUp === "director" ? "Something's about to happen…" : `Writing what you and ${them} should know…`}{" "}
        <span className="typing" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </p>
    );
  }
  const mine = view.nextUp === "me";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`} role="status" aria-label={`${mine ? "Your" : `${them}'s`} clone is typing`}>
      <div className={`typing rounded-2xl px-4 py-3 ${mine ? "bg-me-soft text-me" : "bg-accent-soft text-accent"}`}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function Waiting({ view, them }: { view: DateView; them: string }) {
  const [copied, setCopied] = useState(false);
  const link = view.inviteToken ? `${typeof window === "undefined" ? "" : window.location.origin}/i/${view.inviteToken}` : null;
  return (
    <Card>
      <p>
        Your clone is ready. As soon as {them} accepts and builds their clone, the date starts. You can leave this page; it&apos;ll be waiting.
      </p>
      {link && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-soft px-3 py-2 text-sm">{link}</code>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </Card>
  );
}

function ReportCard({ view, them }: { view: DateView; them: string }) {
  const r = view.report!;
  return (
    <section className="pop mt-10 rounded-3xl border border-line bg-card p-6 shadow-card">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">After the date</p>
      <h2 className="mt-1 font-serif text-4xl leading-tight">Before you meet {them}</h2>
      <p className="mt-3 text-lg">{r.summary}</p>

      <h3 className="mt-6 font-semibold text-good">Where you click</h3>
      <ul className="mt-2 space-y-3">
        {r.aligned.map((a) => (
          <li key={a.point}>
            {a.point}
            <span className="mt-0.5 block text-sm italic text-muted">{a.evidence}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 font-semibold text-warn">Worth talking about</h3>
      <ul className="mt-2 space-y-3">
        {r.clashes.map((c) => (
          <li key={c.point}>
            {c.point}
            <span className="mt-0.5 block text-sm italic text-muted">{c.evidence}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 font-semibold">Ask each other</h3>
      <ul className="mt-2 space-y-2">
        {r.starters.map((s) => (
          <li key={s} className="rounded-2xl bg-soft px-4 py-2.5">
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted">Clones can show you what you&apos;d talk about. They can&apos;t predict chemistry; that part is up to you two.</p>
    </section>
  );
}

function Meet({ view, them, onChange }: { view: DateView; them: string; onChange: (v: DateView) => void }) {
  const [busy, setBusy] = useState(false);
  const demo = view.them?.isDemo;

  async function answer(yes: boolean) {
    setBusy(true);
    const res = await fetch(`/api/dates/${view.id}/meet`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ yes }) });
    if (res.ok) onChange(await res.json());
    setBusy(false);
  }

  let body: React.ReactNode;
  if (view.myMeet === null) {
    body = (
      <>
        <h2 className="font-serif text-3xl">Want to meet {them}?</h2>
        <p className="mt-1 text-muted">{them} only finds out if you both say yes.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn btn-primary" disabled={busy} onClick={() => answer(true)}>
            Yes, I&apos;d meet
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => answer(false)}>
            Not this time
          </button>
        </div>
      </>
    );
  } else if (demo) {
    body = (
      <>
        <h2 className="font-serif text-3xl">{view.myMeet ? "Nice." : "Fair enough."}</h2>
        <p className="mt-2">
          {them} is a demo person, so there&apos;s no one to meet this time. With a real match, if you both say yes, this is where you&apos;d get each
          other&apos;s contact.
        </p>
        <Link href="/home" className="btn btn-primary mt-5">
          Invite someone real
        </Link>
      </>
    );
  } else if (view.myMeet === false) {
    body = <p>Got it. {them} won&apos;t be told why, only that it&apos;s not a match this time.</p>;
  } else if (view.contact) {
    body = (
      <>
        <h2 className="font-serif text-3xl">You both said yes 🎉</h2>
        <p className="mt-2">
          Reach {them} at <strong className="break-all">{view.contact}</strong>. Bring one of the questions above.
        </p>
      </>
    );
  } else if (view.theirMeet === false) {
    body = <p>{them} isn&apos;t up for meeting this time. That&apos;s okay. The report is still yours.</p>;
  } else {
    body = (
      <p>
        You said yes. We&apos;ll show you {them}&apos;s contact as soon as they say yes too. <span className="text-muted">(Checking…)</span>
      </p>
    );
  }
  return <section className="mt-6 rounded-3xl border border-accent/40 bg-card p-6">{body}</section>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 rounded-2xl border border-line bg-card p-5">{children}</div>;
}
