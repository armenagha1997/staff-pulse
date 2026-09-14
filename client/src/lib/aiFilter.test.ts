import { describe, expect, it } from "vitest";
import type { AggregatedRow } from "@/lib/aggregate";
import { matchesFilter } from "@/lib/aiFilter";

function row(overrides: Partial<AggregatedRow>): AggregatedRow {
  return {
    id: "id",
    name: "Команда данных",
    level: 3,
    totalHeadcount: 10,
    totalBudget: 1_000_000,
    avgPerformance: 70,
    ...overrides,
  };
}

describe("matchesFilter", () => {
  it("matches everything when the filter is empty", () => {
    expect(matchesFilter(row({}), {})).toBe(true);
  });

  it("filters by level", () => {
    expect(matchesFilter(row({ level: 2 }), { levels: [1, 3] })).toBe(false);
    expect(matchesFilter(row({ level: 3 }), { levels: [1, 3] })).toBe(true);
  });

  it("filters by headcount range", () => {
    const r = row({ totalHeadcount: 15 });
    expect(matchesFilter(r, { minHeadcount: 20 })).toBe(false);
    expect(matchesFilter(r, { maxHeadcount: 10 })).toBe(false);
    expect(matchesFilter(r, { minHeadcount: 10, maxHeadcount: 20 })).toBe(true);
  });

  it("filters by budget range", () => {
    const r = row({ totalBudget: 5_000_000 });
    expect(matchesFilter(r, { minBudget: 6_000_000 })).toBe(false);
    expect(matchesFilter(r, { maxBudget: 4_000_000 })).toBe(false);
    expect(matchesFilter(r, { minBudget: 1_000_000, maxBudget: 6_000_000 })).toBe(true);
  });

  it("filters by performance range", () => {
    const r = row({ avgPerformance: 82 });
    expect(matchesFilter(r, { minPerformance: 90 })).toBe(false);
    expect(matchesFilter(r, { maxPerformance: 80 })).toBe(false);
    expect(matchesFilter(r, { minPerformance: 80 })).toBe(true);
  });

  it("filters by name substring, case-insensitively", () => {
    const r = row({ name: "Отдел «Бренд»" });
    expect(matchesFilter(r, { nameContains: "бренд" })).toBe(true);
    expect(matchesFilter(r, { nameContains: "стратегия" })).toBe(false);
  });

  it("combines multiple constraints with AND semantics", () => {
    const r = row({ level: 3, avgPerformance: 90, totalHeadcount: 5 });
    expect(matchesFilter(r, { levels: [3], minPerformance: 80 })).toBe(true);
    expect(matchesFilter(r, { levels: [3], minPerformance: 95 })).toBe(false);
  });
});
