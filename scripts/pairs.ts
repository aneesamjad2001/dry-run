// Test pairs for the eval. Each pair has ONE planted clash: a dealbreaker on one side
// that the other side is on the wrong end of. Everything else is ordinary, so a good
// date surfaces the planted clash and a bad one (clones agreeing with everything)
// doesn't.

import type { CloneProfile, Person } from "../lib/engine.ts";

function person(name: string, p: Partial<CloneProfile> & Pick<CloneProfile, "summary" | "dealbreakers">): Person {
  return {
    name,
    profile: {
      looking_for: "Something real if it clicks, no rush.",
      values: ["kindness", "curiosity", "close friends"],
      conflict_style: "Says what they think, then wants to talk it through the same day.",
      money: "Careful but not stingy; on a student budget.",
      interests: ["coffee shops in Hyde Park", "walking by the lake", "cooking with friends"],
      opinions: ["The Reg is better than Harper for actually working"],
      voice: "Casual lowercase texts, short, a bit dry.",
      sample_lines: ["lol fair", "ok wait that's actually a good point", "i'm so down"],
      ...p,
    },
  };
}

export type Pair = { id: string; clash: string; a: Person; b: Person };

export const PAIRS: Pair[] = [
  {
    id: "smoking",
    clash: "Maya won't date a smoker; Sam smokes and doesn't plan to quit.",
    a: person("Maya", { summary: "Second-year bio major, runs with the club team, early riser.", dealbreakers: ["Won't date a smoker, cigarettes or vapes. Her dad smoked."] }),
    b: person("Sam", {
      summary: "Third-year in econ, works at a jazz bar on weekends, night owl.",
      dealbreakers: ["Being told how to live"],
      opinions: ["Smoking with friends after a shift is one of the best parts of his week and he isn't quitting."],
    }),
  },
  {
    id: "money",
    clash: "Priya saves hard and would skip a $300 trip; Leo spends on travel even if it means cutting back after.",
    a: person("Priya", {
      summary: "Fourth-year CS, paying part of her own tuition.",
      money: "Strict saver. Sends money home. A $300 weekend would be her whole monthly budget.",
      dealbreakers: ["Someone careless with money who expects her to keep up."],
    }),
    b: person("Leo", {
      summary: "Second-year in anthropology, has been to 14 countries.",
      money: "Spends on experiences, figures out the rest later. Travel is how he recharges.",
      dealbreakers: ["A partner who won't travel."],
    }),
  },
  {
    id: "kids",
    clash: "Ana definitely wants kids; Theo never wants children.",
    a: person("Ana", { summary: "MAPH student, oldest of five siblings.", looking_for: "Something serious that could lead to marriage.", dealbreakers: ["Someone who doesn't want kids. She wants at least two."] }),
    b: person("Theo", { summary: "PhD student in physics, loves his freedom.", looking_for: "Serious relationship.", dealbreakers: ["Having children. He's certain he never wants them."] }),
  },
  {
    id: "faith",
    clash: "Hannah needs a partner who shares her faith; Omar is a firm atheist.",
    a: person("Hannah", { summary: "Third-year in public policy, goes to church every Sunday, sings in the choir.", dealbreakers: ["A partner who doesn't share her Christian faith."] }),
    b: person("Omar", {
      summary: "Second-year philosophy major, debate team.",
      dealbreakers: ["Being pressured into religion."],
      opinions: ["He's a firm atheist and thinks organised religion does more harm than good."],
    }),
  },
  {
    id: "location",
    clash: "Jess is staying in Chicago for good; Ravi is moving to San Francisco after graduation and won't do long distance.",
    a: person("Jess", { summary: "Fourth-year in education, already has a teaching job lined up in Chicago.", dealbreakers: ["Leaving Chicago. Her family and job are here and she's staying."] }),
    b: person("Ravi", {
      summary: "Fourth-year CS, has a job offer in San Francisco starting in July.",
      dealbreakers: ["Long distance. He tried it once and won't again."],
      opinions: ["He's moving to SF in July no matter what."],
    }),
  },
  {
    id: "exclusivity",
    clash: "Claire wants to be exclusive; Marcus wants to keep seeing other people.",
    a: person("Claire", { summary: "Second-year in history, a romantic.", looking_for: "Exclusive relationship.", dealbreakers: ["Someone who wants to keep seeing other people."] }),
    b: person("Marcus", { summary: "Third-year in math, just out of a long relationship.", looking_for: "Wants to keep things open and keep dating other people for now.", dealbreakers: ["Being locked into exclusivity early."] }),
  },
  {
    id: "dog",
    clash: "Emily is severely allergic to dogs; Diego's dog is non-negotiable.",
    a: person("Emily", { summary: "Third-year in chemistry, plants everywhere in her apartment.", dealbreakers: ["Dogs. She has a severe allergy and can't be around them."] }),
    b: person("Diego", { summary: "Fourth-year in poli sci, fosters rescue dogs.", dealbreakers: ["Someone who can't be around his dog Biscuit. Biscuit comes first."] }),
  },
  {
    id: "nightlife",
    clash: "Nora is a homebody who hates parties; Jay goes out four nights a week and wants a partner who comes along.",
    a: person("Nora", { summary: "Second-year in English, reads a book a week.", interests: ["reading", "quiet nights in", "baking"], dealbreakers: ["Being dragged to parties. She hates loud crowds."] }),
    b: person("Jay", { summary: "Third-year in econ, social chair of his house.", interests: ["parties", "clubs downtown", "big group dinners"], dealbreakers: ["A partner who won't come out with him. He goes out four nights a week."] }),
  },
  {
    id: "politics",
    clash: "Zoe won't date a conservative; Ben is a proud conservative.",
    a: person("Zoe", { summary: "Fourth-year in sociology, organizes with a tenants' union.", dealbreakers: ["Dating a conservative."] }),
    b: person("Ben", { summary: "Third-year in economics, president of the College Republicans.", dealbreakers: ["Someone who can't respect his politics."], opinions: ["He's a proud conservative and says so."] }),
  },
  {
    id: "seriousness",
    clash: "Lily wants a serious relationship; Kai only wants something casual.",
    a: person("Lily", { summary: "Third-year in neuroscience, pre-med.", looking_for: "A serious relationship. She's done with situationships.", dealbreakers: ["Someone who just wants something casual."] }),
    b: person("Kai", { summary: "Second-year in visual arts, studying abroad next year.", looking_for: "Casual only. Not looking for anything serious before he leaves.", dealbreakers: ["Commitment right now."] }),
  },
];
