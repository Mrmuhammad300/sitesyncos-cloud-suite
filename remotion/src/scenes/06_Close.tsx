import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "../components/tokens";
import { FadeIn } from "../components/Shared";

export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Three module panels slide in
  const panel1 = spring({ frame: frame - 10, fps, config: { damping: 22, stiffness: 60 }, from: -300, to: 0 });
  const panel2 = spring({ frame: frame - 24, fps, config: { damping: 22, stiffness: 60 }, from: -300, to: 0 });
  const panel3 = spring({ frame: frame - 38, fps, config: { damping: 22, stiffness: 60 }, from: -300, to: 0 });

  // Logo and CTA
  const logoOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlOpacity = interpolate(frame, [115, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulse
  const pulse = Math.sin(frame * 0.07) * 0.015 + 1;

  // Fade out at very end
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const modules = [
    {
      label: "SiteSync Build", icon: "🏗️", color: BRAND.blue,
      features: ["Project Management", "Gantt Schedule", "RFIs & Submittals", "Change Orders", "Daily Reports", "Punch List"],
    },
    {
      label: "SiteSync Ops", icon: "⚙️", color: BRAND.green,
      features: ["Cost Dashboard", "Budget Tracking", "Work Orders", "Tenant Management", "Draw Requests", "Document Vault"],
    },
    {
      label: "SiteSync Vault", icon: "📈", color: BRAND.accent,
      features: ["Property Portfolio", "ROI / IRR Analysis", "DCF Calculator", "Lender Portal", "Compliance Tracking", "Capital Management"],
    },
  ];

  return (
    <div style={{ width: 1920, height: 1080, background: BRAND.bg, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden", opacity: fadeOut }}>

      {/* Radial glows */}
      <div style={{ position: "absolute", top: -300, left: "30%", width: 900, height: 900, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.blue}18, transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -200, right: "20%", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.green}14, transparent 70%)` }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", padding: "50px 80px" }}>

        {/* Module panels */}
        <div style={{ display: "flex", gap: 32, width: "100%", marginBottom: 50 }}>
          {modules.map((mod, i) => {
            const x = i === 0 ? panel1 : i === 1 ? panel2 : panel3;
            return (
              <div key={mod.label} style={{
                flex: 1, transform: `translateY(${x}px)`,
                background: BRAND.surface, border: `1px solid ${mod.color}44`,
                borderRadius: 20, padding: "32px 28px",
                boxShadow: `0 0 40px ${mod.color}22`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `${mod.color}22`, border: `1px solid ${mod.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                  }}>{mod.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.white }}>{mod.label}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mod.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 99, background: mod.color, flexShrink: 0 }} />
                      <span style={{ color: BRAND.muted }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Logo */}
        <div style={{ opacity: logoOpacity, display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.accent})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${BRAND.blue}66`,
            transform: `scale(${pulse})`,
          }}>
            <svg width="34" height="34" viewBox="0 0 38 38" fill="none">
              <rect x="4" y="20" width="8" height="14" rx="2" fill="white" />
              <rect x="15" y="12" width="8" height="22" rx="2" fill="white" opacity="0.85" />
              <rect x="26" y="4" width="8" height="30" rx="2" fill="white" opacity="0.7" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 48, fontWeight: 900, color: BRAND.white, letterSpacing: -1, lineHeight: 1 }}>SiteSync</div>
            <div style={{ fontSize: 16, color: BRAND.blue, fontWeight: 600, letterSpacing: 4 }}>CLOUD SUITE</div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: ctaOpacity, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, color: BRAND.muted, fontStyle: "italic" }}>
            From first shovel to final distribution.
          </div>
        </div>

        {/* CTA */}
        <div style={{ opacity: urlOpacity, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            fontSize: 40, fontWeight: 900, color: BRAND.white,
            background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.accent})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Start your free trial today
          </div>
          <div style={{
            fontSize: 32, fontWeight: 700, color: BRAND.blue,
            background: `${BRAND.blue}18`, border: `1px solid ${BRAND.blue}44`,
            borderRadius: 16, padding: "12px 40px",
            boxShadow: `0 0 30px ${BRAND.blue}44`,
          }}>
            SiteSyncCloud.com
          </div>
        </div>
      </div>
    </div>
  );
};
