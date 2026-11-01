/** Score tone: ≥90 healthy, ≥75 watch, below that breach. */
export function scoreTone(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "muted" as const;
  return v >= 90 ? ("success" as const) : v >= 75 ? ("warning" as const) : ("destructive" as const);
}
