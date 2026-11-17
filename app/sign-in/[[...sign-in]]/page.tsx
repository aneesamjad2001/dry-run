import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-center text-sm text-muted">Use your UChicago email.</p>
      <SignIn />
    </div>
  );
}
