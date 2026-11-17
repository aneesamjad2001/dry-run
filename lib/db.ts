import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The server's Supabase client, using the SECRET key. It bypasses row-level security,
// which is why it must never be imported by client code ("server-only" enforces that).
// RLS is on with no policies, so the publishable key can read nothing at all.
let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase isn't configured: set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
