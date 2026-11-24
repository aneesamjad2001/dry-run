import { SignOutButton } from "@clerk/nextjs";
import { allowedDomain } from "@/lib/viewer";

export const metadata = { title: "UChicago only" };

export default function UChicagoOnly() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-serif text-4xl">Just UChicago, for now</h1>
      <p className="mt-4 text-muted">
        Dry Run is starting with UChicago students, so everyone you meet here is a real classmate. Sign in with your @{allowedDomain} email to
        continue.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <SignOutButton redirectUrl="/sign-in">
          <button className="btn btn-primary">Use my UChicago email</button>
        </SignOutButton>
        <SignOutButton redirectUrl="/">
          <button className="btn btn-ghost">Back to the home page</button>
        </SignOutButton>
      </div>
    </div>
  );
}
