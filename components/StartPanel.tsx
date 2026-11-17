"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import type { PublicPerson } from "@/lib/data";

export function StartPanel({ demos }: { demos: PublicPerson[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(body: object, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/dates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      return data as { id: string; token?: string };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  const message = link
    ? `ok this is a bit weird but hear me out: before we actually meet, want to send our AI clones on a first date? takes 5 min ${link}`
    : "";

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-accent/40 bg-card p-6 shadow-card">
        <h2 className="font-serif text-3xl">Invite someone you matched with</h2>
        <p className="mt-1 text-muted">On Hinge, Tinder, at a party, wherever. They build their clone, then your clones go on a first date.</p>
        {!link ? (
          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await start({ invite: true, label }, "invite");
              if (r?.token) setLink(`${window.location.origin}/i/${r.token}`);
            }}
          >
            <label className="sr-only" htmlFor="label">
              Who is it for?
            </label>
            <input
              id="label"
              className="field sm:flex-1"
              placeholder="Who's it for? (just for you, e.g. Sam from Hinge)"
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy !== null}>
              {busy === "invite" ? "Making link…" : "Get invite link"}
            </button>
          </form>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium">Send them this:</p>
            <p className="rounded-2xl rounded-br-sm bg-me-soft px-4 py-3 text-[15px] break-words">{message}</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary" onClick={copy}>
                {copied ? "Copied" : "Copy message"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setLink(null);
                  setLabel("");
                  router.refresh();
                }}
              >
                Done
              </button>
            </div>
            <p className="text-sm text-muted">You&apos;ll see it under “Your dry runs” once they accept.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-3xl">Or try it first with a demo person</h2>
        <p className="mt-1 text-muted">These are made-up UChicago students, so you can see how a dry run goes before inviting anyone.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {demos.map((p) => (
            <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4">
              <Avatar name={p.name} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.name} <span className="ml-1 rounded-full bg-soft px-2 py-0.5 text-xs font-medium text-muted">Demo</span>
                </p>
                <p className="text-sm text-muted">{p.year}</p>
                <p className="mt-0.5 text-sm">{p.bio}</p>
              </div>
              <button
                className="btn btn-ghost shrink-0 px-4 text-sm"
                disabled={busy !== null}
                aria-label={`Start a dry run with ${p.name}`}
                onClick={async () => {
                  const r = await start({ demo: p.id }, p.id);
                  if (r) router.push(`/dates/${r.id}`);
                }}
              >
                {busy === p.id ? "Starting…" : "Dry run"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
