import { requireViewer } from "@/lib/viewer";
import { unpackAnswers } from "@/lib/questions";
import { Interview } from "@/components/Interview";

export const metadata = { title: "Build your clone" };

function safeNext(n: string | string[] | undefined): string | null {
  // Same-origin paths only: reject "//x", "/\\x" and control characters, which browsers
  // can treat as another site.
  if (typeof n !== "string" || !/^\/[A-Za-z0-9_\-/?=&%.]*$/.test(n) || n.startsWith("//")) return null;
  return n;
}

export default async function InterviewPage({ searchParams }: PageProps<"/interview">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const v = await requireViewer(`/interview${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const p = v.profile;
  const saved = unpackAnswers(p?.answers ?? []);
  return (
    <Interview
      next={next}
      isRedo={!!p}
      initial={{
        name: p?.name ?? "",
        year: p?.year ?? "",
        bio: p?.bio ?? "",
        contact: p?.contact ?? "",
        answers: saved.core,
        facts: saved.facts,
      }}
    />
  );
}
