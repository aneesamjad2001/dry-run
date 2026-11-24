import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <p className="max-w-sm rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3 text-center text-[15px]">
        <strong>UChicago students only, for now.</strong> Use your <strong>@uchicago.edu</strong> email. Gmail and other addresses won&apos;t get
        in.
      </p>
      <SignUp />
      <Link href="/" className="text-sm font-medium text-muted underline hover:text-fg">
        ← Back to the home page
      </Link>
    </div>
  );
}
