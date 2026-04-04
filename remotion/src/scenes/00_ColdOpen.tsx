import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "../components/tokens";

const Chaos: React.FC<{ text: string; x: number; y: number; delay: number; color?: string }> = ({
  text, x, y, delay, color = BRAND.muted,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 8, delay + 40, delay + 50], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", left: x, top: y, color,
      fontFamily: "system-ui", fontWeight: 600, fontSize: 22, opacity,
      background: `${BRAND.surface}cc`, padding: "8px 18px",
      borderRadius: 8, border: `1px solid ${BRAND.border}`,
    }}>{text}</div>
  );
};

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Background grid
  const gridOpacity = interpolate(frame, [0, 20], [0, 0.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Logo reveal
  const logoScale = spring({ frame: frame - 110, fps, config: { damping: 18, stiffness: 60 }, from: 0.4, to: 1 });
  const logoOpacity = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Tagline
  const tagOpacity = interpolate(frame, [140, 160], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [140, 160], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Hook text lines
  const line1Opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2Opacity = interpolate(frame, [25, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line3Opacity = interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textFadeOut = interpolate(frame, [90, 110], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulse on logo
  const pulse = Math.sin(frame * 0.08) * 0.02 + 1;

  return (
    <div style={{ width: 1920, height: 1080, background: BRAND.bg, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>

      {/* Animated grid background */}
      <svg style={{ position: "absolute", inset: 0, opacity: gridOpacity }} width="1920" height="1080">
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={1080} stroke={BRAND.blue} strokeWidth={1} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 90} x2={1920} y2={i * 90} stroke={BRAND.blue} strokeWidth={1} />
        ))}
      </svg>

      {/* Chaos tools floating */}
      <Chaos text="RFIs in App A" x={120} y={180} delay={5} color={BRAND.red} />
      <Chaos text="Budgets in Excel" x={900} y={120} delay={12} color={BRAND.yellow} />
      <Chaos text="Tenants in Email" x={1400} y={260} delay={18} color={BRAND.muted} />
      <Chaos text="Lender Docs in Drive" x={200} y={750} delay={22} color={BRAND.muted} />
      <Chaos text="Schedule in MS Project" x={1100} y={820} delay={28} color={BRAND.red} />
      <Chaos text="Change Orders in Email" x={600} y={600} delay={35} color={BRAND.yellow} />
      <Chaos text="Punch List in Notes App" x={1500} y={680} delay={10} color={BRAND.muted} />

      {/* Hook lines */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: textFadeOut }}>
        <div style={{ opacity: line1Opacity, fontSize: 52, fontWeight: 800, color: BRAND.white, textAlign: "center", marginBottom: 20 }}>
          Still managing construction in
          <span style={{ color: BRAND.blue }}> 5 different tools?</span>
        </div>
        <div style={{ opacity: line2Opacity, fontSize: 28, color: BRAND.muted, textAlign: "center", maxWidth: 800, lineHeight: 1.6 }}>
          RFIs in one app. Budgets in another. Tenants in a spreadsheet.<br />
          Lender documents in email.
        </div>
        <div style={{ opacity: line3Opacity, marginTop: 32, fontSize: 32, color: BRAND.white, textAlign: "center", fontStyle: "italic" }}>
          What if <span style={{ color: BRAND.green, fontStyle: "normal", fontWeight: 700 }}>one platform</span> ran everything?
        </div>
      </div>

      {/* Logo reveal */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        opacity: logoOpacity, transform: `scale(${logoScale})`,
      }}>
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${BRAND.blue}66`,
            transform: `scale(${pulse})`,
          }}>
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <rect x="4" y="20" width="8" height="14" rx="2" fill="white" />
              <rect x="15" y="12" width="8" height="22" rx="2" fill="white" opacity="0.85" />
              <rect x="26" y="4" width="8" height="30" rx="2" fill="white" opacity="0.7" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 64, fontWeight: 900, color: BRAND.white, letterSpacing: -2, lineHeight: 1 }}>SiteSync</div>
            <div style={{ fontSize: 22, color: BRAND.blue, fontWeight: 600, letterSpacing: 4 }}>CLOUD SUITE</div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOpacity, transform: `translateY(${tagY}px)`, display: "flex", gap: 32, alignItems: "center", marginTop: 16 }}>
          {["Build.", "Operate.", "Own."].map((word, i) => (
            <div key={word} style={{ fontSize: 36, fontWeight: 700, color: i === 0 ? BRAND.blue : i === 1 ? BRAND.green : BRAND.accent }}>{word}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
