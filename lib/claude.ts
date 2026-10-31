import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = process.env.NUDGE_MODEL ?? "claude-opus-5-5";
type Effort = "low" | "medium" | "high" | "xhigh" | "max";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export type Turn = Anthropic.Beta.BetaMessageParam;

// One structured call. Returns the parsed object plus the assistant content to append to history,
// so multi-turn twins keep their own thinking blocks (append-only history).
export async function ask<S extends z.ZodType>(opts: {
  system: string;
  messages: Turn[];
  schema: S;
  effort?: Effort;
  maxTokens?: number;
  // Let Claude search the web (server-side) before answering, up to this many searches.
  webSearches?: number;
}): Promise<{ data: z.infer<S>; assistant: Turn }> {
  let messages = opts.messages;
  const request = () =>
    anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages,
      ...(opts.webSearches ? { tools: [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: opts.webSearches }] } : {}),
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  let res = await request();
  // A long server-side search loop can pause; send the turn back as is and the server resumes it.
  for (let i = 0; i < 3 && res.stop_reason === "pause_turn"; i++) {
    messages = [...messages, { role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] }];
    res = await request();
  }
  if (res.stop_reason === "refusal") throw new Error(`Model refused: ${res.stop_details?.explanation ?? "no detail"}`);
  if (res.stop_reason === "max_tokens") throw new Error("Hit max_tokens before finishing the structured output");
  if (!res.parsed_output) throw new Error("Structured output did not parse");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const b of res.content) {
    if (b.type === "thinking") content.push({ type: "thinking", thinking: b.thinking, signature: b.signature });
    else if (b.type === "text") content.push({ type: "text", text: b.text });
  }
  return { data: res.parsed_output as z.infer<S>, assistant: { role: "assistant", content } };
}
