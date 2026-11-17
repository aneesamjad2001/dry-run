// The clone interview. Fixed questions for v1 (an adaptive AI interviewer is a v2 idea).
// Each question targets something the clone needs to hold its ground on a date.

export const QUESTIONS: { q: string; hint: string }[] = [
  { q: "Describe a perfect Saturday in Chicago.", hint: "Where you'd go, who with, what time you'd wake up." },
  { q: "What are you looking for right now?", hint: "Something serious, casual, not sure? Anything specific?" },
  { q: "What would you never compromise on in a partner?", hint: "Your real dealbreakers. Be specific: “won't date a smoker” beats “honesty”." },
  { q: "How do you handle money?", hint: "Saver or spender? Would you go on a $300 weekend trip with friends?" },
  { q: "When you disagree with someone you care about, what do you actually do?", hint: "Go quiet, argue it out, joke, let it go?" },
  { q: "What's an opinion you hold that most people around you don't?", hint: "Anything: food, politics, campus, life." },
  { q: "Where do you see yourself after graduation?", hint: "City, job, grad school, kids someday or not." },
  { q: "Write a text to a friend the way you'd actually send it.", hint: "Your clone copies how you write: punctuation, emoji, slang." },
];

export const MIN_ANSWER = 3;
export const MAX_ANSWER = 800;
