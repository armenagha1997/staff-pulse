import type { StructuredFilter } from "./types.js";

const FILTER_TOOL = {
  name: "apply_org_filter",
  description: "Применить структурированный фильтр к списку подразделений компании.",
  input_schema: {
    type: "object",
    properties: {
      nameContains: { type: "string", description: "Подстрока в названии подразделения" },
      levels: {
        type: "array",
        items: { type: "number", enum: [1, 2, 3] },
        description: "1=дивизион, 2=отдел, 3=команда",
      },
      minHeadcount: { type: "number" },
      maxHeadcount: { type: "number" },
      minBudget: { type: "number" },
      maxBudget: { type: "number" },
      minPerformance: { type: "number" },
      maxPerformance: { type: "number" },
    },
    additionalProperties: false,
  },
};

interface AnthropicToolUseBlock {
  type: "tool_use";
  name: string;
  input: Record<string, unknown>;
}

// Optional enhancement: if ANTHROPIC_API_KEY is set, delegate NL parsing to
// Claude via forced tool-use (so the response IS the structured filter, no
// free-text to parse). Returns null on missing key, network error, timeout,
// or an unexpected response shape — every caller treats null as "fall back
// to the offline heuristic parser", so this path can never make search less
// available than without it.
export async function llmParse(query: string): Promise<StructuredFilter | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system:
          "Переведи запрос пользователя об орг-структуре компании (дивизионы/отделы/команды, " +
          "численность, бюджет в рублях, эффективность 0-100) в структурированный фильтр, " +
          "вызвав apply_org_filter. Указывай только ограничения, упомянутые в запросе.",
        messages: [{ role: "user", content: query }],
        tools: [FILTER_TOOL],
        tool_choice: { type: "tool", name: FILTER_TOOL.name },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { content?: unknown };
    const content = Array.isArray(json.content) ? json.content : [];
    const toolUse = content.find(
      (block): block is AnthropicToolUseBlock =>
        typeof block === "object" && block !== null && (block as { type?: unknown }).type === "tool_use",
    );

    return toolUse ? (toolUse.input as StructuredFilter) : null;
  } catch {
    return null;
  }
}
