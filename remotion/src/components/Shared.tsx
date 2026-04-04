import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "./tokens";

// ── Fade-in wrapper ──────────────────────────────────────────────────────────
export const FadeIn: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0, children, style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame: frame - delay, fps, config: { damping: 40, stiffness: 80 }, from: 0, to: 1 });
  const translateY = interpolate(frame - delay, [0, 15], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};

// ── Slide-in from left ───────────────────────────────────────────────────────
export const SlideIn: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0, children, style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame: frame - delay, fps, config: { damping: 40 }, from: 0, to: 1 });
  const x = interpolate(frame - delay, [0, 20], [-60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, transform: `translateX(${x}px)`, ...style }}>
      {children}
    </div>
  );
};

// ── Animated counter ─────────────────────────────────────────────────────────
export const Counter: React.FC<{ end: number; prefix?: string; suffix?: string; delay?: number; decimals?: number }> = ({
  end, prefix = "", suffix = "", delay = 0, decimals = 0,
}) => {
  const frame = useCurrentFrame();
  const val = interpolate(frame - delay, [0, 45], [0, end], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <>{prefix}{val.toFixed(decimals)}{suffix}</>;
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
export const KPICard: React.FC<{
  label: string; value: string | React.ReactNode;
  color?: string; delay?: number; icon?: string;
}> = ({ label, value, color = BRAND.white, delay = 0, icon }) => (
  <FadeIn delay={delay}>
    <div style={{
      background: BRAND.surface, border: `1px solid ${BRAND.border}`,
      borderRadius: 16, padding: "28px 32px", minWidth: 220,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {icon && <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: 15, color: BRAND.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  </FadeIn>
);

// ── Badge ────────────────────────────────────────────────────────────────────
export const Badge: React.FC<{ label: string; color?: string; bg?: string }> = ({
  label, color = BRAND.blue, bg,
}) => (
  <span style={{
    background: bg ?? `${color}22`, color, border: `1px solid ${color}44`,
    borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 600,
  }}>{label}</span>
);

// ── Progress bar ─────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{ pct: number; color?: string; delay?: number; height?: number }> = ({
  pct, color = BRAND.green, delay = 0, height = 8,
}) => {
  const frame = useCurrentFrame();
  const animated = interpolate(frame - delay, [0, 40], [0, pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ background: BRAND.border, borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${animated}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.1s" }} />
    </div>
  );
};

// ── Section title lower-third ────────────────────────────────────────────────
export const LowerThird: React.FC<{ module: string; title: string; delay?: number }> = ({
  module, title, delay = 0,
}) => (
  <FadeIn delay={delay} style={{
    position: "absolute", bottom: 60, left: 80,
    display: "flex", flexDirection: "column", gap: 4,
  }}>
    <div style={{ fontSize: 13, color: BRAND.blue, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>{module}</div>
    <div style={{ fontSize: 28, color: BRAND.white, fontWeight: 700 }}>{title}</div>
    <div style={{ width: 48, height: 3, background: BRAND.blue, borderRadius: 2 }} />
  </FadeIn>
);

// ── Screen mock ──────────────────────────────────────────────────────────────
export const ScreenMock: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: BRAND.surface, border: `1px solid ${BRAND.border}`,
    borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", ...style,
  }}>
    {/* Browser chrome */}
    <div style={{ background: "#0D1525", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${BRAND.border}` }}>
      <div style={{ width: 12, height: 12, borderRadius: 99, background: "#EF4444" }} />
      <div style={{ width: 12, height: 12, borderRadius: 99, background: "#F59E0B" }} />
      <div style={{ width: 12, height: 12, borderRadius: 99, background: "#10B981" }} />
      <div style={{ flex: 1, background: BRAND.border, borderRadius: 8, height: 22, marginLeft: 16, display: "flex", alignItems: "center", paddingLeft: 12 }}>
        <span style={{ fontSize: 11, color: BRAND.muted }}>sitesynccloud.com</span>
      </div>
    </div>
    {children}
  </div>
);

// ── Callout annotation ───────────────────────────────────────────────────────
export const Callout: React.FC<{ text: string; delay?: number; style?: React.CSSProperties }> = ({ text, delay = 0, style }) => (
  <FadeIn delay={delay} style={style}>
    <div style={{
      background: BRAND.blue, color: BRAND.white, borderRadius: 10,
      padding: "8px 18px", fontSize: 14, fontWeight: 700,
      boxShadow: `0 0 20px ${BRAND.blue}88`,
      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: BRAND.white, flexShrink: 0 }} />
      {text}
    </div>
  </FadeIn>
);
