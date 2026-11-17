"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteAnswer({ token, name }: { token: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function answer(accept: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invites/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept }) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    if (accept) router.push(`/dates/${data.dateId}`);
    else setDeclined(true);
  }

  if (declined) return <p className="text-muted">No problem. {name} won&apos;t be told why, just that it&apos;s not happening.</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled={busy} onClick={() => answer(true)}>
          {busy ? "Starting…" : "Send our clones on a date"}
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={() => answer(false)}>
          No thanks
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
