import type { AggregatedRow } from "@/lib/aggregate";

export type ColumnKey = "name" | "level" | "totalHeadcount" | "totalBudget" | "avgPerformance";

export interface Column {
  key: ColumnKey;
  label: string;
  align: "left" | "right";
}

export const COLUMNS: Column[] = [
  { key: "name", label: "Подразделение", align: "left" },
  { key: "level", label: "Уровень", align: "right" },
  { key: "totalHeadcount", label: "Всего сотрудников", align: "right" },
  { key: "totalBudget", label: "Бюджет суммарный", align: "right" },
  { key: "avgPerformance", label: "Средняя эффективность", align: "right" },
];

export function compareRows(a: AggregatedRow, b: AggregatedRow, key: ColumnKey): number {
  if (key === "name") {
    return a.name.localeCompare(b.name, "ru");
  }
  return a[key] - b[key];
}
