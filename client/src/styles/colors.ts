export const colors = {
  background: "#0f172a",
  surface: "#1a2438",
  surfaceRaised: "#212d47",
  border: "#2c3a5a",
  text: "#e6ebf5",
  textMuted: "#93a2c2",
  accent: "#5b8def",
  performanceHigh: "#3ecf8e",
  performanceMid: "#f2b84b",
  performanceLow: "#ef5a6f",
  danger: "#ef5a6f",
} as const;

export function performanceColor(performance: number): string {
  if (performance >= 80) return colors.performanceHigh;
  if (performance >= 50) return colors.performanceMid;
  return colors.performanceLow;
}
