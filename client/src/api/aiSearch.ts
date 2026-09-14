import { AiSearchResponseSchema, type StructuredFilter } from "@/api/schema";

export interface AiSearchResult {
  filter: StructuredFilter;
  source: "llm" | "heuristic" | "text-fallback";
}

// Structured-filter search with a client-side fallback: if the round trip to
// /api/ai-search fails for ANY reason (network down, non-2xx, malformed
// body), the query itself becomes a plain name search — still expressed as
// a StructuredFilter, so callers never need a separate code path for it.
export async function runAiSearch(query: string): Promise<AiSearchResult> {
  try {
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) throw new Error(`ai-search failed with status ${res.status}`);

    const json: unknown = await res.json();
    const parsed = AiSearchResponseSchema.safeParse(json);
    if (!parsed.success) throw new Error("invalid ai-search response shape");

    return parsed.data;
  } catch {
    return { filter: { nameContains: query.trim() }, source: "text-fallback" };
  }
}
