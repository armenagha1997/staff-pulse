import type { StructuredFilter } from "./types.js";

const LEVEL_WORDS: Record<string, number> = {
  "дивизион": 1,
  "дивизионы": 1,
  "дивизиона": 1,
  "дивизионов": 1,
  "отдел": 2,
  "отделы": 2,
  "отдела": 2,
  "отделов": 2,
  "команда": 3,
  "команды": 3,
  "команд": 3,
};

function parseAmount(raw: string, unit?: string): number {
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (unit && /млн/i.test(unit)) return value * 1_000_000;
  if (unit && /тыс/i.test(unit)) return value * 1_000;
  return value;
}

const NUMBER_UNIT = /([\d\s.,]+)\s*(млн[а-яё.]*|тыс[а-яё.]*)?/;

// Rule-based fallback NLU: no external API, no network dependency, runs
// entirely offline. Handles the common shapes ("выше/больше/от N",
// "ниже/меньше/до N") for performance, budget, and headcount, plus
// level-name keywords (дивизион/отдел/команда). Anything it can't parse into
// a structured constraint degrades to a plain name search — this IS the
// "text search" fallback the assignment asks for, just produced through the
// same StructuredFilter contract so the client doesn't need a separate path.
export function heuristicParse(query: string): StructuredFilter {
  const q = query.toLowerCase();
  const filter: StructuredFilter = {};

  const levels = new Set<number>();
  for (const [word, level] of Object.entries(LEVEL_WORDS)) {
    if (q.includes(word)) levels.add(level);
  }
  if (levels.size > 0) filter.levels = [...levels];

  const perfMore = q.match(new RegExp(`эффективност[а-яё]*\\s*(?:выше|больше|более|от)\\s*(\\d+)`));
  if (perfMore) filter.minPerformance = Number(perfMore[1]);
  const perfLess = q.match(new RegExp(`эффективност[а-яё]*\\s*(?:ниже|меньше|менее|до)\\s*(\\d+)`));
  if (perfLess) filter.maxPerformance = Number(perfLess[1]);

  const budgetMoreMatch = q.match(new RegExp(`бюджет[а-яё]*\\s*(?:выше|больше|более|от)\\s*${NUMBER_UNIT.source}`));
  if (budgetMoreMatch) filter.minBudget = parseAmount(budgetMoreMatch[1], budgetMoreMatch[2]);
  const budgetLessMatch = q.match(new RegExp(`бюджет[а-яё]*\\s*(?:ниже|меньше|менее|до)\\s*${NUMBER_UNIT.source}`));
  if (budgetLessMatch) filter.maxBudget = parseAmount(budgetLessMatch[1], budgetLessMatch[2]);

  const headMoreMatch = q.match(new RegExp(`сотрудник[а-яё]*\\s*(?:выше|больше|более|от)\\s*(\\d+)`));
  if (headMoreMatch) filter.minHeadcount = Number(headMoreMatch[1]);
  const headLessMatch = q.match(new RegExp(`сотрудник[а-яё]*\\s*(?:ниже|меньше|менее|до)\\s*(\\d+)`));
  if (headLessMatch) filter.maxHeadcount = Number(headLessMatch[1]);

  if (Object.keys(filter).length === 0) {
    filter.nameContains = query.trim();
  }

  return filter;
}
