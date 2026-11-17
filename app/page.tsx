import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const PHOTOS = {
  laugh: {
    src: "https://images.unsplash.com/photo-1564858625447-278284a4d574?w=1200&q=80&auto=format&fit=crop",
    alt: "Two students laughing together at a cafe counter",
    credit: "Tito Ferreira",
    page: "https://unsplash.com/photos/man-and-woman-sitting-and-laughing-RtSa0uuWrqI",
  },
  walk: {
    src: "https://images.unsplash.com/photo-1764540707789-a92971f77f38?w=900&q=80&auto=format&fit=crop",
    alt: "A couple walking down a snowy sidewalk in downtown Chicago",
    credit: "William Hadley",
    page: "https://unsplash.com/photos/two-people-walk-down-a-snowy-city-street-bPSv_fc_l_Y",
  },
  mugs: {
    src: "https://images.unsplash.com/photo-1548051072-b34898021f8b?w=900&q=80&auto=format&fit=crop",
    alt: "Two people holding coffee mugs across a wooden table",
    credit: "Jonathan J. Castellon",
    page: "https://unsplash.com/photos/two-person-holding-ceramic-mugs-with-coffee-be8AmxavYp8",
  },
};

export default async function Landing() {
  const { userId } = await auth();
  if (userId) redirect("/home");

  return (
    <div className="space-y-20 py-4">
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="font-serif text-6xl leading-[0.95] sm:text-7xl">
            A first date <em className="text-accent">before</em> the first date.
          </h1>
          <p className="mt-6 text-lg">
            <strong>Matched with someone, but the chat is going nowhere?</strong> Send them a Dry Run. Your clones go on a first date, and you both get
            a real reason to meet: where you click, where you&apos;d clash, and what to talk about.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/home" className="btn btn-primary">
              Try a dry run
            </Link>
            <span className="text-sm text-muted">For UChicago students · free · about 5 minutes</span>
          </div>
        </div>
        <div className="relative">
          <Image
            src={PHOTOS.laugh.src}
            alt={PHOTOS.laugh.alt}
            width={1200}
            height={800}
            priority
            sizes="(min-width: 768px) 340px, 100vw"
            className="aspect-[4/5] w-full rounded-3xl object-cover shadow-card"
          />
          <div className="absolute -bottom-6 -left-4 max-w-[85%] rounded-2xl border border-line bg-card p-3 text-sm shadow-card sm:-left-8">
            <div className="flex gap-2">
              <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-xs font-semibold text-good">You click</span>
              <span>Both love the lake at 6am</span>
            </div>
            <div className="mt-1.5 flex gap-2">
              <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">Talk about</span>
              <span>Saving vs. that $300 trip</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-4xl">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["Tell us who you are", "Eight quick questions. Your clone learns what you care about, what you won't budge on, and how you text."],
            ["Send the link to your match", "When they build their clone too, the two clones meet for coffee. You can watch it happen."],
            ["Get a reason to meet", "Where you click, where you'd clash, three things to ask each other. If you both say yes, you swap numbers."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-[15px] text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid items-center gap-8 md:grid-cols-2">
        <Image
          src={PHOTOS.mugs.src}
          alt={PHOTOS.mugs.alt}
          width={900}
          height={600}
          sizes="(min-width: 768px) 360px, 100vw"
          className="aspect-[4/3] w-full rounded-3xl object-cover"
        />
        <div>
          <h2 className="font-serif text-4xl">Why not just a compatibility quiz?</h2>
          <p className="mt-4">
            A quiz tells you whether you match <em>on paper</em>. But everyone says they&apos;re &ldquo;easygoing about money&rdquo; until a friend
            invites you both on a $300 weekend. A dry run puts your clones in that moment and shows how it actually plays out.
          </p>
          <p className="mt-3">
            And there&apos;s no score. Research says nobody can predict chemistry from a profile, so we don&apos;t pretend to. You get something to
            talk about, and the rest is up to you two.
          </p>
        </div>
      </section>

      <section className="grid items-center gap-8 md:grid-cols-[1fr_0.8fr]">
        <div>
          <h2 className="font-serif text-4xl">Your clone stays yours</h2>
          <ul className="mt-4 space-y-2">
            {[
              "Clones only ever talk to each other. They never message a real person.",
              "Nothing happens until both of you say yes to the dry run.",
              "Your answers stay private. Your match sees the date, never your profile.",
              "Your contact info is shared only if you both want to meet.",
              "Delete your clone any time.",
            ].map((r) => (
              <li key={r} className="flex gap-3">
                <span className="text-good" aria-hidden>
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
          <Link href="/home" className="btn btn-primary mt-8">
            Build your clone
          </Link>
        </div>
        <Image
          src={PHOTOS.walk.src}
          alt={PHOTOS.walk.alt}
          width={900}
          height={1200}
          sizes="(min-width: 768px) 300px, 100vw"
          className="aspect-[4/5] w-full rounded-3xl object-cover"
        />
      </section>

      <footer className="border-t border-line pt-6 text-xs text-muted">
        Photos on Unsplash by{" "}
        {Object.values(PHOTOS).map((p, i, all) => (
          <span key={p.page}>
            <a className="underline" href={p.page}>
              {p.credit}
            </a>
            {i < all.length - 1 ? ", " : "."}
          </span>
        ))}{" "}
        Dry Run is a student project for Design, Build, Ship at UChicago.
      </footer>
    </div>
  );
}
