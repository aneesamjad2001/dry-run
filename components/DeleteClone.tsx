"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteClone() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button className="btn btn-ghost text-muted" onClick={() => setConfirming(true)}>
        Delete my clone
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm">This deletes your clone and every dry run you were part of.</span>
      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/profile", { method: "DELETE" });
          if (res.ok) router.push("/interview");
          else setBusy(false);
        }}
      >
        {busy ? "Deleting…" : "Yes, delete it"}
      </button>
      <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
        Keep it
      </button>
    </div>
  );
}
