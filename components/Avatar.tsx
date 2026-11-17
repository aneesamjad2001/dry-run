// A warm initial in a soft colour, so people show up as people even without photos.
const TONES = [
  ["#fde2e4", "#9d174d"],
  ["#e0ecff", "#1e40af"],
  ["#fdecc8", "#92400e"],
  ["#dcfce7", "#166534"],
  ["#ede9fe", "#5b21b6"],
  ["#ffe4d6", "#9a3412"],
];

export function DemoTag() {
  return <span className="ml-2 rounded-full bg-soft px-2 py-0.5 align-middle text-xs font-medium text-muted">Demo</span>;
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  const [bg, fg] = TONES[sum % TONES.length];
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-serif"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.48 }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
