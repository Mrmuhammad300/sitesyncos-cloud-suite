/**
 * Recharts theme helpers. Every value resolves through CSS variables so
 * charts follow light/dark mode automatically — never hardcode HSL in a chart.
 */
import type { CSSProperties } from "react";

export const CHART = {
  c1: "hsl(var(--chart-1))",
  c2: "hsl(var(--chart-2))",
  c3: "hsl(var(--chart-3))",
  c4: "hsl(var(--chart-4))",
  c5: "hsl(var(--chart-5))",
  c6: "hsl(var(--chart-6))",
  primary: "hsl(var(--primary))",
  data: "hsl(var(--data))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
  surface: "hsl(var(--surface-2))",
} as const;

/** Ordered categorical palette. */
export const SERIES = [CHART.c1, CHART.c2, CHART.c3, CHART.c4, CHART.c5, CHART.c6] as const;

/** Status → chart color, shared by every pie/bar that groups by status. */
export const STATUS_CHART_COLOR: Record<string, string> = {
  "On Track": CHART.success,
  "At Risk": CHART.warning,
  Behind: CHART.destructive,
  Complete: CHART.info,
};

const tick = { fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "Geist Mono, ui-monospace, monospace" };

export const axisProps = {
  tick,
  stroke: "transparent",
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

export const gridProps = {
  stroke: "hsl(var(--border))",
  strokeDasharray: "2 4",
  vertical: false,
} as const;

export const tooltipStyle: CSSProperties = {
  fontSize: 12,
  borderRadius: 10,
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  color: "hsl(var(--popover-foreground))",
  boxShadow: "0 16px 40px -16px hsl(var(--shadow-color) / 0.6)",
  padding: "8px 10px",
};

export const tooltipProps = {
  contentStyle: tooltipStyle,
  labelStyle: { color: "hsl(var(--muted-foreground))", fontSize: 11, marginBottom: 4 },
  itemStyle: { color: "hsl(var(--popover-foreground))", padding: 0 },
  cursor: { fill: "hsl(var(--foreground) / 0.04)", stroke: "hsl(var(--border-strong))" },
} as const;

export const legendProps = {
  iconType: "circle" as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 12, color: "hsl(var(--muted-foreground))" },
};
