import Link from "next/link";
import { redirect } from "next/navigation";
import { getInvite } from "@/lib/data";
import { getViewer } from "@/lib/viewer";
import { Avatar } from "@/components/Avatar";
import { InviteAnswer } from "@/components/InviteAnswer";

export const metadata = { title: "You're invited" };

// The invitee's first look at Dry Run. It has to explain itself before asking anyone
// to sign up, so it works signed out too.
export default async function InvitePage({ params }: PageProps<"/i/[token]">) {
  const { token } = await params;
  const here = `/i/${token}`;
  const v = await getViewer();
  if (v && !v.allowed) redirect("/uchicago-only");

  const inv = await getInvite(token, v?.userId ?? "");
  if (!inv) {
    return <Message title="This link doesn't work">Ask the person who sent it for a new one.</Message>;
  }
  if (inv.acceptedByMe) redirect(`/dates/${inv.dateId}`);
  if (inv.mine) redirect(`/dates/${inv.dateId}`);
  if (inv.status !== "invited") {
    return <Message title="This invite was already used">Ask {inv.from.name} to send you a new link.</Message>;
  }

  const { from } = inv;
  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="flex items-center gap-4">
        <Avatar name={from.name} photo={from.photo} size={72} />
        <div>
          <p className="text-lg font-semibold">{from.name}</p>
          {from.year && <p className="text-sm text-muted">{from.year}</p>}
        </div>
      </div>
      {from.bio && <p className="mt-4 rounded-2xl rounded-tl-sm bg-soft px-4 py-3">{from.bio}</p>}

      <h1 className="mt-8 font-serif text-5xl leading-tight">
        {from.name} wants your clones to go on a <em className="text-accent">first date</em>.
      </h1>
      <ol className="mt-6 space-y-3 text-[15px]">
        <li>
          <strong>1. You spend about 5 minutes on a few questions</strong> so your clone knows what you care about and how you text. Only your clone sees your
          answers.
        </li>
        <li>
          <strong>2. Your clones meet up.</strong> You can watch the conversation.
        </li>
        <li>
          <strong>3. You both get a short report:</strong> where you click, where you&apos;d clash, and what to ask each other. If you both want to
          meet, you swap contacts.
        </li>
      </ol>

      <div className="mt-8">
        {!v ? (
          <div className="flex flex-wrap gap-3">
            <Link href={`/sign-up?redirect_url=${encodeURIComponent(here)}`} className="btn btn-primary">
              Sign up with UChicago email
            </Link>
            <Link href={`/sign-in?redirect_url=${encodeURIComponent(here)}`} className="btn btn-ghost">
              I have an account
            </Link>
          </div>
        ) : !v.profile ? (
          <Link href={`/interview?next=${encodeURIComponent(here)}`} className="btn btn-primary">
            Build my clone first
          </Link>
        ) : (
          <InviteAnswer token={token} name={from.name} />
        )}
      </div>
    </div>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-serif text-4xl">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
      <Link href="/" className="btn btn-ghost mt-8">
        What is Dry Run?
      </Link>
    </div>
  );
}
