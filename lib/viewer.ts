import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfile, type ProfileRow } from "./data";

// Who is looking at this page or calling this API, and are they allowed in?
// Dry Run v1 is for UChicago students: the primary email must be on the allowed domain.

const DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "uchicago.edu").toLowerCase();

export type Viewer = { userId: string; allowed: boolean; profile: ProfileRow | null };

export async function getViewer(): Promise<Viewer | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress;
  const allowed = !!email && email.verification?.status === "verified" && email.emailAddress.toLowerCase().endsWith(`@${DOMAIN}`);
  const profile = allowed ? await getProfile(userId) : null;
  return { userId, allowed, profile };
}

/** For pages: signed in and on the allowed domain, or redirect. */
export async function requireViewer(next: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/sign-in?redirect_url=${encodeURIComponent(next)}`);
  if (!v.allowed) redirect("/uchicago-only");
  return v;
}

/** For pages: like requireViewer, and they must have built their clone. */
export async function requireMember(next: string): Promise<Viewer & { profile: ProfileRow }> {
  const v = await requireViewer(next);
  if (!v.profile) redirect(`/interview?next=${encodeURIComponent(next)}`);
  return v as Viewer & { profile: ProfileRow };
}

/** For API routes: the viewer, or a JSON error response to return. */
export async function apiViewer(opts: { needProfile: boolean }): Promise<Viewer | Response> {
  const v = await getViewer();
  if (!v) return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!v.allowed) return Response.json({ error: `Dry Run is for @${DOMAIN} emails for now.` }, { status: 403 });
  if (opts.needProfile && !v.profile) return Response.json({ error: "Build your clone first." }, { status: 403 });
  return v;
}

export const allowedDomain = DOMAIN;
