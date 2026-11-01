import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  stroke?: string;
  className?: string;
  /** Fill under the line with a soft gradient. */
  area?: boolean;
}

/** Dependency-free SVG sparkline — cheap enough to render dozens per page. */
export function Sparkline({ data, stroke = "hsl(var(--primary))", className, area = true }: SparklineProps) {
  const id = useId();
  const { line, fill, last } = useMemo(() => {
    const w = 100;
    const h = 32;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pts = data.map((v, i) => [
      (i / Math.max(data.length - 1, 1)) * w,
      h - 3 - ((v - min) / span) * (h - 6),
    ]);
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    return { line: d, fill: `${d} L${w},${h} L0,${h} Z`, last: pts[pts.length - 1] };
  }, [data]);

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn("overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && <path d={fill} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={last[0]} cy={last[1]} r={2.25} fill={stroke} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
