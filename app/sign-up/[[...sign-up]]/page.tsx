import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-center text-sm text-muted">Dry Run is for UChicago students. Sign up with your @uchicago.edu email.</p>
      <SignUp />
    </div>
  );
}
