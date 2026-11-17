import { clerkSetup } from "@clerk/testing/playwright";
import { createClient } from "@supabase/supabase-js";
import { ALEX, SAM } from "./users";

const CLERK_API = "https://api.clerk.com/v1";

/** Make sure a test user exists (created with no password; tests sign in with a one-time
 *  token) and return their Clerk id. */
async function ensureUser(email: string): Promise<string> {
  const headers = { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" };
  const found = await fetch(`${CLERK_API}/users?email_address=${encodeURIComponent(email)}`, { headers });
  if (!found.ok) throw new Error(`Clerk user lookup failed: ${found.status}`);
  const list = (await found.json()) as { id: string }[];
  if (list.length > 0) return list[0].id;
  const made = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: [email], skip_password_requirement: true }),
  });
  if (!made.ok) throw new Error(`Couldn't create test user ${email}: ${made.status} ${await made.text()}`);
  return ((await made.json()) as { id: string }).id;
}

export default async function globalSetup() {
  for (const k of ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY"]) {
    if (!process.env[k]) throw new Error(`${k} is missing: add it to .env.local`);
  }
  if (!process.env.CLERK_SECRET_KEY!.startsWith("sk_test_")) {
    throw new Error("E2E tests only run against a Clerk development instance (sk_test_ key).");
  }
  await clerkSetup();
  const ids = [await ensureUser(ALEX), await ensureUser(SAM)];
  // Start every run as brand-new people: delete their clones (cascades to their dry runs).
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const { error } = await db.from("profiles").delete().in("user_id", ids);
  if (error) throw new Error(`Couldn't reset test users: ${error.message}`);
}
