const budgetFormatter = new Intl.NumberFormat("ru-RU");

export function formatBudget(amount: number): string {
  return `${budgetFormatter.format(Math.round(amount))} руб.`;
}
