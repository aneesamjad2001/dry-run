"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// "Say it instead": speech-to-text with the browser's own dictation (Web Speech API), so
// there is no upload, no key and no cost. Browsers without it (Firefox) just don't show
// the button. Each finished phrase is handed to onText to add to the answer.

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscription = () => () => {};

export function Dictate({ onText }: { onText: (text: string) => void }) {
  // False on the server and in browsers without dictation, so the button never flashes in.
  const supported = useSyncExternalStore(noSubscription, () => recognitionClass() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const rec = useRef<Recognition | null>(null);
  // The recogniser outlives renders: always call the newest onText, which holds the newest answer.
  const send = useRef(onText);
  useEffect(() => {
    send.current = onText;
  });

  useEffect(() => () => rec.current?.stop(), []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const R = recognitionClass();
    if (!R) return;
    const r = new R();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) send.current(e.results[i][0].transcript.trim());
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setBlocked(true);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setBlocked(false);
    setListening(true);
    r.start();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <button type="button" className={`chip ${listening ? "chip-on" : ""}`} aria-pressed={listening} onClick={toggle}>
        <span aria-hidden>{listening ? "■" : "🎙"}</span> {listening ? "Stop" : "Say it instead"}
      </button>
      <span className="text-muted" role="status">
        {blocked ? "Allow the microphone in your browser to use this." : listening ? "Listening… talk the way you'd tell a friend." : "Rather talk than type? Your words show up above."}
      </span>
    </div>
  );
}
