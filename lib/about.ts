// Ten questions that say more about a person than a CV does. Answers go into the twin's history in the
// owner's own words (they are context, not the sealed answer key).
export const ABOUT_QUESTIONS = [
  "What are you trying to do with your life, in one or two sentences?",
  "What problem would you keep working on for ten years even if it paid nothing? Why that one?",
  "Which three values would you never trade, and when did holding one of them cost you something?",
  "Where do you want to be in 12 months: city, work, money, relationships?",
  "What was the best moment of the past five years, and why did it matter so much?",
  "What was the hardest moment of the past five years, and what did it change in you?",
  "What do you need from the people you build with, and what drains you?",
  "How do you make big decisions: gut, data, or people you trust? Give a recent example.",
  "What are you not willing to give up right now (people, place, project, time, money)?",
  "What would make you proud a year from now, even if nobody else noticed?",
] as const;

export const aboutItemId = (owner: string, i: number) => `${owner}:interview:q${i + 1}`;
