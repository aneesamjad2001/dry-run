import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import {
  actionAt,
  openingEvent,
  runStep,
  TOTAL_STEPS,
  type CloneProfile,
  type DateEvent,
  type Person,
  type Report,
} from "./engine";

// Everything that reads or writes the database goes through here, and every function
// that returns data to a person returns ONLY what that person may see: never another
// person's clone profile or answers, and their contact info only after both said yes.

export type ProfileRow = {
  user_id: string;
  name: string;
  year: string;
  bio: string;
  contact: string;
  answers: { question: string; answer: string }[];
  clone: CloneProfile;
  is_demo: boolean;
};

type DateRow = {
  id: string;
  user_a: string;
  user_b: string | null;
  invite_token: string | null;
  invitee_label: string;
  status: "invited" | "declined" | "running" | "done";
  step: number;
  events: DateEvent[];
  report: Report | null;
  a_meet: boolean | null;
  b_meet: boolean | null;
  created_at: string;
};

export class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAILY_DATE_LIMIT = 8; // dry runs a person can start per 24h; keeps model spend bounded

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ---------------------------------------------------------------------------
// Profiles

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  return check(await db().from("profiles").select("*").eq("user_id", userId).maybeSingle()) as ProfileRow | null;
}

export async function saveProfile(userId: string, p: Omit<ProfileRow, "user_id" | "is_demo">): Promise<void> {
  check(await db().from("profiles").upsert({ user_id: userId, ...p, is_demo: false }));
}

export async function deleteProfile(userId: string): Promise<void> {
  // Cascades to every dry run they were part of.
  check(await db().from("profiles").delete().eq("user_id", userId).eq("is_demo", false));
}

export type PublicPerson = { id: string; name: string; year: string; bio: string; isDemo: boolean };

function publicPerson(p: Pick<ProfileRow, "user_id" | "name" | "year" | "bio" | "is_demo">): PublicPerson {
  return { id: p.user_id, name: p.name, year: p.year, bio: p.bio, isDemo: p.is_demo };
}

export async function listDemoPeople(): Promise<PublicPerson[]> {
  const rows = check(await db().from("profiles").select("user_id, name, year, bio, is_demo").eq("is_demo", true).order("name"));
  return (rows ?? []).map(publicPerson);
}

// ---------------------------------------------------------------------------
// Starting dry runs

async function checkDailyLimit(userId: string) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count, error } = await db().from("dates").select("id", { count: "exact", head: true }).eq("user_a", userId).gte("created_at", since);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= DAILY_DATE_LIMIT) throw new UserError("You've started a lot of dry runs today. Try again tomorrow.", 429);
}

export async function startDemoDate(me: ProfileRow, demoId: string): Promise<string> {
  const demo = await getProfile(demoId);
  if (!demo || !demo.is_demo) throw new UserError("That demo person doesn't exist.", 404);
  await checkDailyLimit(me.user_id);
  const row = check(
    await db()
      .from("dates")
      .insert({ user_a: me.user_id, user_b: demo.user_id, status: "running", events: [openingEvent(me.name, demo.name)] })
      .select("id")
      .single(),
  ) as { id: string };
  return row.id;
}

export async function createInvite(me: ProfileRow, label: string): Promise<{ id: string; token: string }> {
  await checkDailyLimit(me.user_id);
  const token = randomBytes(18).toString("base64url");
  const row = check(
    await db().from("dates").insert({ user_a: me.user_id, invite_token: token, invitee_label: label.slice(0, 60) }).select("id").single(),
  ) as { id: string };
  return { id: row.id, token };
}

export type InviteView = { status: DateRow["status"]; from: PublicPerson; mine: boolean; dateId: string; acceptedByMe: boolean };

export async function getInvite(token: string, userId: string): Promise<InviteView | null> {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const d = check(await db().from("dates").select("id, user_a, user_b, status").eq("invite_token", token).maybeSingle()) as Pick<
    DateRow,
    "id" | "user_a" | "user_b" | "status"
  > | null;
  if (!d) return null;
  const from = await getProfile(d.user_a);
  if (!from) return null;
  return { status: d.status, from: publicPerson(from), mine: d.user_a === userId, dateId: d.id, acceptedByMe: d.user_b === userId };
}

export async function answerInvite(token: string, me: ProfileRow, accept: boolean): Promise<string> {
  const inv = await getInvite(token, me.user_id);
  if (!inv) throw new UserError("This invite link doesn't work.", 404);
  if (inv.mine) throw new UserError("That's your own invite. Send the link to the person you matched with.");
  if (inv.acceptedByMe) return inv.dateId;
  if (inv.status !== "invited") throw new UserError("This invite has already been used.", 409);
  const patch = accept
    ? { user_b: me.user_id, status: "running", events: [openingEvent(inv.from.name, me.name)] }
    : { status: "declined" };
  // Only flips an invite that is still open, so two people can't both accept it.
  const rows = check(await db().from("dates").update(patch).eq("invite_token", token).eq("status", "invited").select("id")) as { id: string }[];
  if (!rows.length) throw new UserError("This invite has already been used.", 409);
  return inv.dateId;
}

// ---------------------------------------------------------------------------
// Reading a dry run

export type ViewEvent = { who: "me" | "them" | "director"; text: string; scene: 1 | 2 };

export type DateView = {
  id: string;
  status: DateRow["status"];
  step: number;
  totalSteps: number;
  nextUp: "me" | "them" | "director" | "judge" | null;
  meName: string;
  them: PublicPerson | null;
  inviteeLabel: string | null;
  inviteToken: string | null;
  events: ViewEvent[];
  report: Report | null;
  myMeet: boolean | null;
  theirMeet: boolean | null; // only revealed once I've answered
  contact: string | null; // only when both said yes
};

async function getDateRow(id: string): Promise<DateRow | null> {
  if (!UUID.test(id)) return null;
  return check(await db().from("dates").select("*").eq("id", id).maybeSingle()) as DateRow | null;
}

function sideOf(d: DateRow, userId: string): "a" | "b" | null {
  return d.user_a === userId ? "a" : d.user_b === userId ? "b" : null;
}

async function toView(d: DateRow, userId: string): Promise<DateView> {
  const side = sideOf(d, userId)!;
  const theirId = side === "a" ? d.user_b : d.user_a;
  const [mine, theirs] = await Promise.all([getProfile(userId), theirId ? getProfile(theirId) : null]);
  const myMeet = side === "a" ? d.a_meet : d.b_meet;
  const theirMeetRaw = side === "a" ? d.b_meet : d.a_meet;
  const action = actionAt(d.step);
  const nextUp =
    d.status !== "running"
      ? null
      : action.kind === "turn"
        ? action.speaker === side
          ? "me"
          : "them"
        : action.kind === "done"
          ? null
          : action.kind;
  return {
    id: d.id,
    status: d.status,
    step: d.step,
    totalSteps: TOTAL_STEPS,
    nextUp,
    meName: mine?.name ?? "You",
    them: theirs ? publicPerson(theirs) : null,
    inviteeLabel: side === "a" ? d.invitee_label || null : null,
    inviteToken: side === "a" && d.status === "invited" ? d.invite_token : null,
    events: d.events.map((e) => ({ who: e.speaker === "director" ? "director" : e.speaker === side ? "me" : "them", text: e.text, scene: e.scene })),
    report: d.status === "done" ? d.report : null,
    myMeet,
    theirMeet: myMeet === null ? null : theirMeetRaw,
    contact: myMeet === true && theirMeetRaw === true && theirs && !theirs.is_demo ? theirs.contact : null,
  };
}

export async function getDateView(id: string, userId: string): Promise<DateView | null> {
  const d = await getDateRow(id);
  if (!d || !sideOf(d, userId)) return null;
  return toView(d, userId);
}

export type DateSummary = { id: string; status: DateRow["status"]; with: string; isDemo: boolean; createdAt: string };

export async function listMyDates(userId: string): Promise<DateSummary[]> {
  const rows = check(
    await db()
      .from("dates")
      .select("id, user_a, user_b, status, invitee_label, created_at")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(30),
  ) as Pick<DateRow, "id" | "user_a" | "user_b" | "status" | "invitee_label" | "created_at">[];
  const ids = [...new Set(rows.flatMap((r) => [r.user_a, r.user_b]).filter((x): x is string => !!x && x !== userId))];
  const people = ids.length
    ? (check(await db().from("profiles").select("user_id, name, is_demo").in("user_id", ids)) as { user_id: string; name: string; is_demo: boolean }[])
    : [];
  const byId = new Map(people.map((p) => [p.user_id, p]));
  return rows.map((r) => {
    const other = byId.get((r.user_a === userId ? r.user_b : r.user_a) ?? "");
    return {
      id: r.id,
      status: r.status,
      with: other?.name ?? (r.invitee_label || "Someone you invited"),
      isDemo: other?.is_demo ?? false,
      createdAt: r.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Running a dry run, one step per call

export async function stepDate(id: string, userId: string): Promise<DateView> {
  const d = await getDateRow(id);
  if (!d || !sideOf(d, userId)) throw new UserError("Dry run not found.", 404);
  if (d.status !== "running" || !d.user_b) return toView(d, userId);

  const action = actionAt(d.step);
  if (action.kind === "done") {
    check(await db().from("dates").update({ status: "done" }).eq("id", d.id).eq("step", d.step));
    return toView({ ...d, status: "done" }, userId);
  }

  const [a, b] = await Promise.all([getProfile(d.user_a), getProfile(d.user_b)]);
  if (!a || !b) throw new UserError("One of you deleted their clone.", 410);
  const A: Person = { name: a.name, profile: a.clone };
  const B: Person = { name: b.name, profile: b.clone };

  const result = await runStep(d.step, d.events, A, B);
  const patch: Partial<DateRow> & { director_target?: string } = { step: d.step + 1 };
  if (result.event) patch.events = [...d.events, result.event];
  if (result.directorTarget) patch.director_target = result.directorTarget;
  if (result.report) {
    patch.report = result.report;
    patch.status = "done";
  }
  // Optimistic lock: only advance if nobody else (another tab, the other person) already
  // ran this step. If they did, drop ours and return what's saved.
  const rows = check(await db().from("dates").update(patch).eq("id", d.id).eq("step", d.step).select("*")) as DateRow[];
  const saved = rows[0] ?? (await getDateRow(d.id))!;
  return toView(saved, userId);
}

export async function answerMeet(id: string, userId: string, yes: boolean): Promise<DateView> {
  const d = await getDateRow(id);
  const side = d && sideOf(d, userId);
  if (!d || !side) throw new UserError("Dry run not found.", 404);
  if (d.status !== "done") throw new UserError("Wait for the report first.");
  const col = side === "a" ? "a_meet" : "b_meet";
  const rows = check(await db().from("dates").update({ [col]: yes }).eq("id", d.id).select("*")) as DateRow[];
  return toView(rows[0], userId);
}
