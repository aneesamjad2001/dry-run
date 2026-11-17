import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-serif text-2xl leading-none">
          Dry <em className="text-accent">Run</em>
        </Link>
        <Show when="signed-in">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/home" className="text-muted hover:text-fg">
              My dry runs
            </Link>
            <UserButton />
          </nav>
        </Show>
        <Show when="signed-out">
          <Link href="/sign-in" className="text-sm font-medium text-muted hover:text-fg">
            Sign in
          </Link>
        </Show>
      </div>
    </header>
  );
}
