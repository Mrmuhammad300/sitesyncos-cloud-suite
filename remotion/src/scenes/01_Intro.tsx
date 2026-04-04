import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "../components/tokens";
import { FadeIn, KPICard, Counter, LowerThird } from "../components/Shared";

const ModuleIcon: React.FC<{ label: string; icon: string; color: string; delay: number }> = ({
  label, icon, color, delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 80 }, from: 0, to: 1 });
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, transform: `scale(${scale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 100, height: 100, borderRadius: 28,
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        border: `2px solid ${color}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 44, boxShadow: `0 0 30px ${color}44`,
      }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: BRAND.white }}>{label}</div>
    </div>
  );
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 20], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width: 1920, height: 1080, background: BRAND.bg, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>

      {/* Gradient backdrop */}
      <div style={{ position: "absolute", top: -300, right: -200, width: 900, height: 900, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.blue}18, transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -200, left: -100, width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.green}14, transparent 70%)` }} />

      <div style={{ padding: "80px 120px" }}>
        {/* Title */}
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 16 }}>
          <div style={{ fontSize: 18, color: BRAND.blue, fontWeight: 700, letterSpacing: 4, marginBottom: 12, textTransform: "uppercase" }}>Platform Overview</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: BRAND.white, lineHeight: 1.1, maxWidth: 900 }}>
            One platform.<br />
            <span style={{ color: BRAND.blue }}>Three modules.</span><br />
            <span style={{ color: BRAND.green }}>Total control.</span>
          </div>
        </div>

        {/* Subtitle */}
        <FadeIn delay={20}>
          <div style={{ fontSize: 24, color: BRAND.muted, maxWidth: 700, lineHeight: 1.6, marginTop: 24 }}>
            From first shovel to final distribution — SiteSync connects field activity to financial outcome in real time.
          </div>
        </FadeIn>

        {/* KPIs row */}
        <div style={{ display: "flex", gap: 24, marginTop: 60 }}>
          <KPICard label="Active Projects" value={<Counter end={47} delay={30} />} color={BRAND.blue} delay={30} icon="🏗️" />
          <KPICard label="Open RFIs" value={<Counter end={12} delay={40} />} color={BRAND.yellow} delay={40} icon="📋" />
          <KPICard label="Budget Utilization" value={<><Counter end={68} delay={50} />%</>} color={BRAND.green} delay={50} icon="📊" />
          <KPICard label="Monthly Revenue" value={<>$<Counter end={2.4} delay={60} decimals={1} />M</>} color={BRAND.accent} delay={60} icon="💰" />
        </div>

        {/* Module icons */}
        <div style={{ display: "flex", gap: 80, marginTop: 70, paddingLeft: 20 }}>
          <ModuleIcon label="SiteSync Build" icon="🏗️" color={BRAND.blue} delay={80} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <FadeIn delay={100}><div style={{ width: 60, height: 2, background: `linear-gradient(to right, ${BRAND.blue}, ${BRAND.green})` }} /></FadeIn>
          </div>
          <ModuleIcon label="SiteSync Ops" icon="⚙️" color={BRAND.green} delay={90} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <FadeIn delay={110}><div style={{ width: 60, height: 2, background: `linear-gradient(to right, ${BRAND.green}, ${BRAND.accent})` }} /></FadeIn>
          </div>
          <ModuleIcon label="SiteSync Vault" icon="📈" color={BRAND.accent} delay={100} />
        </div>
      </div>
    </div>
  );
};
