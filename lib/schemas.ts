import { z } from "zod";

// One history item from an owner's digital life (message, email, photo caption, calendar entry, note, doc).
export const HistoryItem = z.object({
  id: z.string(),
  source: z.enum(["imessage", "email", "calendar", "note", "photo", "doc", "whatsapp"]),
  ts: z.string(),
  with: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().optional(),
  caption: z.string().optional(),
  text: z.string().optional(),
});
export type HistoryItem = z.infer<typeof HistoryItem>;

export const Founder = z.object({
  owner: z.object({ id: z.string(), name: z.string(), public_bio: z.string() }),
  items: z.array(HistoryItem),
});
export type Founder = z.infer<typeof Founder>;

export const SealedIntent = z.object({
  owner: z.string(),
  note: z.string().optional(),
  red_lines: z.array(z.string()),
  probes: z.array(z.object({ id: z.string(), question: z.string(), answer: z.string() })),
});
export type SealedIntent = z.infer<typeof SealedIntent>;

// What a twin produces on every negotiation turn.
export const TwinTurn = z.object({
  message: z.string().describe("What you say to the other twin. This is the only field the other side sees."),
  private_reasoning: z.string().describe("Why you said it, in terms of your owner's interests. Never shown to the other side."),
  evidence: z.array(z.string()).describe("History item ids that justify the positions you hold this turn."),
  terms: z
    .array(
      z.object({
        topic: z.string(),
        position: z.string(),
        flexibility: z.enum(["firm", "flexible", "open"]),
      })
    )
    .describe("Your owner's current position on each topic under discussion."),
  status: z.enum(["continue", "ready", "walk_away"]),
  owner_questions: z.array(z.string()).describe("Things your owner's history does not answer and you should not guess."),
});
export type TwinTurn = z.infer<typeof TwinTurn>;

export const Outcome = z.object({
  verdict: z.enum(["agreement", "partial", "no_fit"]),
  headline: z.string(),
  proposal: z.array(z.object({ term: z.string(), value: z.string() })),
  reasoning: z.string(),
  gains: z.object({ a: z.array(z.string()), b: z.array(z.string()) }),
  constraints_respected: z.array(
    z.object({ owner: z.enum(["a", "b"]), constraint: z.string(), how: z.string() })
  ),
  unresolved: z.array(
    z.object({ question: z.string(), for_owner: z.enum(["a", "b", "both"]), why: z.string() })
  ),
});
export type Outcome = z.infer<typeof Outcome>;

export const Ratification = z.object({
  endorse: z.boolean(),
  objections: z.array(z.string()),
  evidence: z.array(z.string()),
});
export type Ratification = z.infer<typeof Ratification>;

export const Predictions = z.object({
  answers: z.array(
    z.object({
      probe_id: z.string(),
      answer: z.string(),
      confidence: z.number().describe("0 to 1"),
      evidence: z.array(z.string()),
    })
  ),
});
export type Predictions = z.infer<typeof Predictions>;

export const ProbeGrades = z.object({
  results: z.array(z.object({ probe_id: z.string(), correct: z.boolean(), note: z.string() })),
});
export type ProbeGrades = z.infer<typeof ProbeGrades>;

export const RedLineAudit = z.object({
  violations: z.array(z.object({ owner: z.string(), red_line: z.string(), how: z.string() })),
  notes: z.string(),
});
export type RedLineAudit = z.infer<typeof RedLineAudit>;
