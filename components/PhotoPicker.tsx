"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";

const SIDE = 320; // the saved picture is a 320px square

/** Crops the middle square of a picture and shrinks it, so only a small JPEG leaves the browser. */
async function squareJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const cut = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIDE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, (bitmap.width - cut) / 2, (bitmap.height - cut) / 2, cut, cut, 0, 0, SIDE, SIDE);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

// Optional photo. Shown to the person I invite and the people I do a dry run with.
export function PhotoPicker({ name, photo }: { name: string; photo: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: await squareJpeg(file) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "That didn't save. Try again.");
      setCurrent(body.photo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message !== "no canvas" ? err.message : "We couldn't read that picture. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/profile/photo", { method: "DELETE" });
    if (res.ok) {
      setCurrent(null);
      router.refresh();
    } else setError("That didn't work. Try again.");
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={name} photo={current} size={64} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{current ? "Your photo" : "Add a photo (optional)"}</p>
        <p className="text-sm text-muted">Only the people you invite or do a dry run with can see it.</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choose a photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="flex gap-2">
        <button className="btn btn-ghost px-4 text-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Saving…" : current ? "Change" : "Choose a photo"}
        </button>
        {current && (
          <button className="btn btn-ghost px-4 text-sm text-muted" disabled={busy} onClick={remove}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
