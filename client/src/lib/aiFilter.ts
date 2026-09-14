import type { AggregatedRow } from "@/lib/aggregate";
import type { StructuredFilter } from "@/api/schema";

export function matchesFilter(row: AggregatedRow, filter: StructuredFilter): boolean {
  if (filter.levels && filter.levels.length > 0 && !filter.levels.includes(row.level)) return false;
  if (filter.minHeadcount !== undefined && row.totalHeadcount < filter.minHeadcount) return false;
  if (filter.maxHeadcount !== undefined && row.totalHeadcount > filter.maxHeadcount) return false;
  if (filter.minBudget !== undefined && row.totalBudget < filter.minBudget) return false;
  if (filter.maxBudget !== undefined && row.totalBudget > filter.maxBudget) return false;
  if (filter.minPerformance !== undefined && row.avgPerformance < filter.minPerformance) return false;
  if (filter.maxPerformance !== undefined && row.avgPerformance > filter.maxPerformance) return false;

  if (filter.nameContains) {
    const needle = filter.nameContains.trim().toLowerCase();
    if (needle && !row.name.toLowerCase().includes(needle)) return false;
  }

  return true;
}
