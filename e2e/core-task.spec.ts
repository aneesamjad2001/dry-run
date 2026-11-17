import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { ALEX, SAM } from "./users";

// The core task, end to end, as brand-new people (global.setup deletes their clones first):
//   1. Alex signs up, builds a clone, tries a dry run with demo Maya, reads the report.
//   2. Alex invites Sam; Sam opens the link, builds a clone, accepts; the clones go on a
//      date; both say "want to meet?" and see each other's contact.
// Uses real model calls (free tier), so it takes a few minutes.

const SHOTS = "test-results/screens";
const DATE_TIMEOUT = 10 * 60_000;

async function signIn(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/"); // the landing page loads Clerk without a session
  await clerk.signIn({ page, emailAddress: email });
  return page;
}

async function interview(page: Page, who: { name: string; year: string; bio: string; contact: string; answers: string[] }, shot: string) {
  await expect(page.getByRole("heading", { name: /build your clone/i })).toBeVisible();
  await page.getByLabel("First name").fill(who.name);
  await page.getByLabel("Year and major").fill(who.year);
  await page.getByLabel("One line about you").fill(who.bio);
  await page.getByLabel("How should a match reach you?").fill(who.contact);
  await page.screenshot({ path: `${SHOTS}/${shot}-1-about.png`, fullPage: true });
  await page.getByRole("button", { name: "Next" }).click();
  for (const [i, a] of who.answers.entries()) {
    await page.locator("#answer").fill(a);
    if (i === 2) await page.screenshot({ path: `${SHOTS}/${shot}-2-question.png`, fullPage: true });
    await page.getByRole("button", { name: i === who.answers.length - 1 ? "Build my clone" : "Next" }).click();
  }
  await expect(page.getByRole("heading", { name: "Does this sound like you?" })).toBeVisible({ timeout: 90_000 });
  await page.screenshot({ path: `${SHOTS}/${shot}-3-review.png`, fullPage: true });
  await page.getByRole("button", { name: "That's me" }).click();
}

const ALEX_PROFILE = {
  name: "Alex",
  year: "Third-year · Economics",
  bio: "Lake runs, cheap ramen, and arguing about the best study spot.",
  contact: "@alex.runs on Instagram",
  answers: [
    "up at 7, run along the lake to the point, then ramen in chinatown with my roommate and a movie at the music box",
    "something serious honestly. im tired of talking to people for weeks and never meeting",
    "smoking is a hard no. also people who are rude to waiters",
    "saver. i budget everything and a $300 weekend trip would be my whole month, so probably no",
    "i say it straight away and want to talk it out the same day, i hate the silent treatment",
    "the reg is a better study spot than harper and i will die on that hill",
    "staying in chicago, consulting job lined up. kids someday yes",
    "lol ok wait that's actually so good. are we still on for 7?? bringing snacks",
  ],
};

const SAM_PROFILE = {
  name: "Sam",
  year: "Fourth-year · Anthropology",
  bio: "Fourteen countries, film cameras, live music at the Empty Bottle.",
  contact: "sam.e2e@example.com",
  answers: [
    "sleep in, film photography walk through pilsen, tacos, then a show at the empty bottle",
    "open to something serious if they like adventures",
    "someone who won't travel. and people who plan every single minute",
    "spender honestly. id do the $300 trip and eat ramen after, experiences > stuff",
    "i joke first, cool off, then talk it through properly",
    "chicago winters are fine if you have the right coat",
    "probably moving abroad for a year, then who knows",
    "haha no way. ok but have you been to mexico city, we should just book it",
  ],
};

test("a new person does the whole core task, then invites a match", async ({ browser }) => {
  // ---- 1. Alex: sign up, build a clone, dry run with a demo person --------------------
  const alex = await signIn(browser, ALEX);
  await alex.goto("/");
  await alex.waitForURL(/\/interview/); // signed in, no clone yet: straight to the interview
  await interview(alex, ALEX_PROFILE, "1-alex");

  await expect(alex.getByRole("heading", { name: "Hi Alex." })).toBeVisible();
  await alex.screenshot({ path: `${SHOTS}/1-alex-4-home.png`, fullPage: true });

  await alex.getByRole("button", { name: "Start a dry run with Maya" }).click();
  await alex.waitForURL(/\/dates\//);
  await expect(alex.getByText("Your clone").first()).toBeVisible({ timeout: 120_000 });
  await alex.screenshot({ path: `${SHOTS}/1-alex-5-date-live.png`, fullPage: true });

  const started = Date.now();
  await expect(alex.getByRole("heading", { name: "Before you meet Maya" })).toBeVisible({ timeout: DATE_TIMEOUT });
  console.log(`demo dry run took ${Math.round((Date.now() - started) / 1000)}s after the first line`);
  await alex.screenshot({ path: `${SHOTS}/1-alex-6-report.png`, fullPage: true });

  await alex.getByRole("button", { name: "Yes, I'd meet" }).click();
  await expect(alex.getByText(/Maya is a demo person/)).toBeVisible();
  await alex.screenshot({ path: `${SHOTS}/1-alex-7-meet.png`, fullPage: true });

  // ---- 2. Alex invites Sam --------------------------------------------------------------
  await alex.goto("/home");
  await alex.getByLabel("Who is it for?").fill("Sam from Hinge");
  await alex.getByRole("button", { name: "Get invite link" }).click();
  const message = await alex.locator("p", { hasText: "/i/" }).innerText();
  const link = message.match(/https?:\/\/\S+\/i\/[A-Za-z0-9_-]+/)?.[0];
  expect(link).toBeTruthy();
  await alex.screenshot({ path: `${SHOTS}/2-alex-1-invite.png`, fullPage: true });

  // ---- 3. Sam opens the link, builds a clone, accepts -------------------------------------
  const sam = await signIn(browser, SAM);
  await sam.goto(link!);
  await expect(sam.getByRole("heading", { name: /Alex wants your clones to go on a/ })).toBeVisible();
  await sam.screenshot({ path: `${SHOTS}/3-sam-1-invite.png`, fullPage: true });
  await sam.getByRole("link", { name: "Build my clone first" }).click();
  await interview(sam, SAM_PROFILE, "3-sam");
  await sam.waitForURL(/\/i\//); // back to the invite after the interview
  await sam.getByRole("button", { name: "Send our clones on a date" }).click();
  await sam.waitForURL(/\/dates\//);
  await expect(sam.getByRole("heading", { name: "Before you meet Alex" })).toBeVisible({ timeout: DATE_TIMEOUT });
  await sam.screenshot({ path: `${SHOTS}/3-sam-2-report.png`, fullPage: true });

  // ---- 4. Both want to meet: contacts appear -----------------------------------------------
  await sam.getByRole("button", { name: "Yes, I'd meet" }).click();
  await expect(sam.getByText(/as soon as they say yes too/)).toBeVisible();

  await alex.goto("/home");
  await alex.getByRole("link", { name: /Sam/ }).first().click();
  await expect(alex.getByRole("heading", { name: "Before you meet Sam" })).toBeVisible();
  await alex.getByRole("button", { name: "Yes, I'd meet" }).click();
  await expect(alex.getByText("sam.e2e@example.com")).toBeVisible();
  await alex.screenshot({ path: `${SHOTS}/4-alex-contact.png`, fullPage: true });

  // Sam's page polls, so it shows Alex's contact without a reload.
  await expect(sam.getByText("@alex.runs on Instagram")).toBeVisible({ timeout: 30_000 });
  await sam.screenshot({ path: `${SHOTS}/4-sam-contact.png`, fullPage: true });
});
