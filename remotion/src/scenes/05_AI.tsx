import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "../components/tokens";
import { FadeIn, Badge, Callout, ScreenMock, LowerThird, Counter } from "../components/Shared";

export const AIScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const showAnalytics = frame < 130;
  const showAgents = frame >= 130 && frame < 220;
  const showSearch = frame >= 220;

  const analyticsOpacity = interpolate(frame, [0, 15, 115, 130], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const agentsOpacity = interpolate(frame, [130, 145, 205, 220], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const searchOpacity = interpolate(frame, [220, 235], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Search typing animation
  const searchQuery = "roof drain";
  const charsVisible = Math.floor(interpolate(frame - 240, [0, 20], [0, searchQuery.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const resultsOpacity = interpolate(frame - 262, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Chart bar animation
  const barHeight = (base: number, delay: number) =>
    interpolate(frame - delay, [0, 35], [0, base], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width: 1920, height: 1080, background: BRAND.bg, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", top: -150, left: "50%", transform: "translateX(-50%)", width: 1200, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.accent}10, transparent 70%)` }} />

      <div style={{ display: "flex", height: "100%", gap: 60, padding: "60px 80px", alignItems: "flex-start" }}>

        {/* Left */}
        <div style={{ width: 420, flexShrink: 0, paddingTop: 40 }}>
          <FadeIn>
            <div style={{ fontSize: 13, color: BRAND.accent, fontWeight: 700, letterSpacing: 4, marginBottom: 12, textTransform: "uppercase" }}>AI & Intelligence</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: BRAND.white, lineHeight: 1.1, marginBottom: 24 }}>
              Data that<br />
              <span style={{ color: BRAND.accent }}>works for you.</span>
            </div>
          </FadeIn>
          <FadeIn delay={10}>
            <div style={{ fontSize: 18, color: BRAND.muted, lineHeight: 1.7, marginBottom: 40 }}>
              AI agents, live analytics, and instant search — so you always know what's happening.
            </div>
          </FadeIn>
          {[
            { icon: "🤖", label: "AI Agents", delay: 20 },
            { icon: "📈", label: "Live Analytics", delay: 30 },
            { icon: "⌘", label: "Global Search (Cmd+K)", delay: 40 },
            { icon: "🔔", label: "Real-time Notifications", delay: 50 },
          ].map(f => (
            <FadeIn key={f.label} delay={f.delay}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, fontSize: 16 }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ color: BRAND.white, fontWeight: 500 }}>{f.label}</span>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Right: screens */}
        <div style={{ flex: 1 }}>

          {/* Analytics */}
          <div style={{ opacity: analyticsOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>Analytics</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
                  {[
                    { label: "Budget Efficiency", val: "87%", color: BRAND.green },
                    { label: "On-Time Rate", val: "74%", color: BRAND.blue },
                    { label: "Open RFI Trend", val: "↓ 12", color: BRAND.yellow },
                  ].map((k, i) => (
                    <FadeIn key={k.label} delay={8 + i * 8}>
                      <div style={{ background: BRAND.surface, borderRadius: 10, padding: "16px 20px", border: `1px solid ${BRAND.border}`, textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: BRAND.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 2 }}>{k.label}</div>
                        <div style={{ fontSize: 36, fontWeight: 900, color: k.color }}>{k.val}</div>
                      </div>
                    </FadeIn>
                  ))}
                </div>

                {/* Bar chart */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 120, paddingBottom: 24, borderBottom: `1px solid ${BRAND.border}` }}>
                  {[
                    { label: "Jan", h: 65, color: BRAND.blue },
                    { label: "Feb", h: 78, color: BRAND.blue },
                    { label: "Mar", h: 55, color: BRAND.blue },
                    { label: "Apr", h: 90, color: BRAND.blue },
                    { label: "May", h: 72, color: BRAND.blue },
                    { label: "Jun", h: 88, color: BRAND.accent },
                    { label: "Jul", h: 95, color: BRAND.accent },
                    { label: "Aug", h: 82, color: BRAND.accent },
                    { label: "Sep", h: 100, color: BRAND.green },
                  ].map((b, i) => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", height: barHeight(b.h, 15 + i * 5), background: `linear-gradient(to top, ${b.color}, ${b.color}88)`, borderRadius: "4px 4px 0 0", minHeight: 2 }} />
                      <div style={{ fontSize: 11, color: BRAND.muted }}>{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </ScreenMock>
          </div>

          {/* AI Agents */}
          <div style={{ opacity: agentsOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>AI Agents</div>
                {[
                  { name: "Budget Watchdog", type: "Cost Analysis", status: "Active", lastRun: "2 min ago", insight: "MEP category trending 12% over budget — recommend review" },
                  { name: "RFI Analyzer", type: "Document AI", status: "Active", lastRun: "8 min ago", insight: "3 RFIs pending >5 days — flagged for escalation" },
                  { name: "Schedule Risk Monitor", type: "Schedule AI", status: "Active", lastRun: "15 min ago", insight: "Harbor View Tower critical path at risk — 6 day buffer remaining" },
                ].map((agent, i) => (
                  <FadeIn key={agent.name} delay={12 + i * 14}>
                    <div style={{ background: BRAND.surface, borderRadius: 12, padding: "18px 20px", marginBottom: 12, border: `1px solid ${BRAND.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ display: "flex", align: "center", gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 99, background: BRAND.green, boxShadow: `0 0 10px ${BRAND.green}`, marginTop: 3 }} />
                          <div style={{ marginLeft: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: BRAND.white }}>{agent.name}</span>
                            <span style={{ fontSize: 12, color: BRAND.muted, marginLeft: 10 }}>· {agent.type}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: BRAND.muted }}>Last run: {agent.lastRun}</div>
                      </div>
                      <div style={{ fontSize: 13, color: BRAND.accent, background: `${BRAND.accent}11`, borderRadius: 8, padding: "8px 12px", border: `1px solid ${BRAND.accent}22` }}>
                        💡 {agent.insight}
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </ScreenMock>
          </div>

          {/* Global Search */}
          <div style={{ opacity: searchOpacity, position: "absolute", right: 80, top: 100, width: 1100 }}>
            <FadeIn delay={0}>
              {/* Cmd+K palette */}
              <div style={{
                background: BRAND.surface, border: `1px solid ${BRAND.border}`,
                borderRadius: 20, overflow: "hidden",
                boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px ${BRAND.border}`,
              }}>
                {/* Search input */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 28px", borderBottom: `1px solid ${BRAND.border}` }}>
                  <span style={{ fontSize: 22, opacity: 0.5 }}>🔍</span>
                  <div style={{ flex: 1, fontSize: 22, color: BRAND.white, fontWeight: 500 }}>
                    {searchQuery.slice(0, charsVisible)}
                    <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: BRAND.blue }}>|</span>
                  </div>
                  <div style={{ fontSize: 12, color: BRAND.muted, background: BRAND.border, borderRadius: 6, padding: "4px 8px" }}>⌘K</div>
                </div>

                {/* Results */}
                <div style={{ opacity: resultsOpacity }}>
                  {[
                    { cat: "Projects", icon: "🏗️", name: "Harbor View Tower", sub: "RFI-0042 mentions roof drain", color: BRAND.blue },
                    { cat: "RFIs", icon: "📋", name: "RFI-0042 — Roof drain sizing", sub: "High priority · Open · Harbor View Tower", color: BRAND.yellow },
                    { cat: "Documents", icon: "📄", name: "Plumbing Spec Section 22 10 00", sub: "Uploaded Dec 8, 2025", color: BRAND.green },
                  ].map((r, i) => (
                    <div key={r.name} style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "14px 28px",
                      borderBottom: `1px solid ${BRAND.border}`,
                      background: i === 0 ? `${BRAND.blue}12` : "transparent",
                    }}>
                      <span style={{ fontSize: 20 }}>{r.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.white }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: BRAND.muted }}>{r.sub}</div>
                      </div>
                      <Badge label={r.cat} color={r.color} />
                    </div>
                  ))}
                  <div style={{ padding: "12px 28px", fontSize: 12, color: BRAND.muted }}>↑↓ to navigate · ↵ to open · esc to close</div>
                </div>
              </div>
            </FadeIn>
            <Callout text="Search everything — instantly" delay={40} style={{ position: "absolute", top: -30, right: 60 }} />
          </div>
        </div>
      </div>

      <LowerThird module="AI & Intelligence" title="Insights at Every Step" delay={5} />
    </div>
  );
};
