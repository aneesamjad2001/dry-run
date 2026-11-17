import { requireViewer } from "@/lib/viewer";
import { QUESTIONS } from "@/lib/questions";
import { Interview } from "@/components/Interview";

export const metadata = { title: "Build your clone" };

function safeNext(n: string | string[] | undefined): string | null {
  return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

export default async function InterviewPage({ searchParams }: PageProps<"/interview">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const v = await requireViewer(`/interview${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const p = v.profile;
  return (
    <Interview
      next={next}
      isRedo={!!p}
      initial={{
        name: p?.name ?? "",
        year: p?.year ?? "",
        bio: p?.bio ?? "",
        contact: p?.contact ?? "",
        answers: QUESTIONS.map((_, i) => p?.answers[i]?.answer ?? ""),
      }}
    />
  );
}
