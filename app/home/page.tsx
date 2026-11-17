import Link from "next/link";
import { requireMember } from "@/lib/viewer";
import { listDemoPeople, listMyDates } from "@/lib/data";
import { StartPanel } from "@/components/StartPanel";
import { DeleteClone } from "@/components/DeleteClone";
import { Avatar, DemoTag } from "@/components/Avatar";

export const metadata = { title: "My dry runs" };

const STATUS: Record<string, string> = {
  invited: "Waiting for them to accept",
  declined: "They passed",
  running: "On the date now",
  done: "Report ready",
};

export default async function Home() {
  const v = await requireMember("/home");
  const [demos, dates] = await Promise.all([listDemoPeople(), listMyDates(v.userId)]);

  return (
    <div className="space-y-12 py-4">
      <section>
        <h1 className="font-serif text-5xl leading-tight">Hi {v.profile.name}.</h1>
        <p className="mt-2 text-muted">Who should your clone go on a first date with?</p>
      </section>

      <StartPanel demos={demos} />

      {dates.length > 0 && (
        <section>
          <h2 className="font-serif text-3xl">Your dry runs</h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {dates.map((d) => (
              <li key={d.id}>
                <Link href={`/dates/${d.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-soft">
                  <Avatar name={d.with} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {d.with}
                      {d.isDemo && <DemoTag />}
                    </span>
                    <span className="block text-sm text-muted">{STATUS[d.status]}</span>
                  </span>
                  <span aria-hidden className="text-muted">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">Your clone</h2>
        <p className="mt-1 text-[15px] text-muted">{v.profile.clone.summary}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/interview" className="btn btn-ghost">
            Update my answers
          </Link>
          <DeleteClone />
        </div>
      </section>
    </div>
  );
}
