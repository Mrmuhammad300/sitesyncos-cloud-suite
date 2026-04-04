import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "../components/tokens";
import { FadeIn, Badge, ProgressBar, Callout, ScreenMock, LowerThird, Counter } from "../components/Shared";

export const VaultModule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const showProperties = frame < 120;
  const showROI = frame >= 120 && frame < 230;
  const showLender = frame >= 230;

  const propOpacity = interpolate(frame, [0, 15, 105, 120], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const roiOpacity = interpolate(frame, [120, 135, 215, 230], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lenderOpacity = interpolate(frame, [230, 245], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ROI live calc animation
  const irrVal = interpolate(frame - 150, [0, 60], [8.2, 21.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const equityVal = interpolate(frame - 150, [0, 60], [1.2, 3.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width: 1920, height: 1080, background: BRAND.bg, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", top: -200, right: -100, width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.accent}14, transparent 70%)` }} />

      <div style={{ display: "flex", height: "100%", gap: 60, padding: "60px 80px", alignItems: "flex-start" }}>

        {/* Left */}
        <div style={{ width: 420, flexShrink: 0, paddingTop: 40 }}>
          <FadeIn>
            <div style={{ fontSize: 13, color: BRAND.accent, fontWeight: 700, letterSpacing: 4, marginBottom: 12, textTransform: "uppercase" }}>SiteSync Vault</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: BRAND.white, lineHeight: 1.1, marginBottom: 24 }}>
              Investment<br />
              <span style={{ color: BRAND.accent }}>intelligence.</span>
            </div>
          </FadeIn>
          <FadeIn delay={10}>
            <div style={{ fontSize: 18, color: BRAND.muted, lineHeight: 1.7, marginBottom: 40 }}>
              Portfolio performance, capital tracking, and lender compliance — in one place.
            </div>
          </FadeIn>
          {[
            { icon: "🏢", label: "Property Portfolio", delay: 20 },
            { icon: "📐", label: "DCF / IRR Analysis", delay: 30 },
            { icon: "🏦", label: "Lender Portal", delay: 40 },
            { icon: "🛡️", label: "Compliance Tracking", delay: 50 },
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

          {/* Properties */}
          <div style={{ opacity: propOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>Properties Portfolio</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { name: "Harbor View Tower", type: "Mixed-Use", val: "$28.4M", noi: "$2.1M", cap: "7.4%", irr: "22.1%" },
                    { name: "Westside Mixed-Use", type: "Commercial", val: "$14.2M", noi: "$980K", cap: "6.9%", irr: "18.4%" },
                    { name: "Eastport Lofts", type: "Residential", val: "$8.8M", noi: "$620K", cap: "7.0%", irr: "19.8%" },
                    { name: "Marina District HQ", type: "Office", val: "$32.1M", noi: "$2.6M", cap: "8.1%", irr: "24.3%" },
                  ].map((p, i) => (
                    <FadeIn key={p.name} delay={10 + i * 12}>
                      <div style={{ background: BRAND.surface, borderRadius: 12, padding: "18px 20px", border: `1px solid ${BRAND.border}` }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.white, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: BRAND.muted, marginBottom: 12 }}>{p.type}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[
                            { label: "Value", val: p.val, color: BRAND.white },
                            { label: "NOI", val: p.noi, color: BRAND.green },
                            { label: "Cap Rate", val: p.cap, color: BRAND.blue },
                            { label: "Equity IRR", val: p.irr, color: BRAND.accent },
                          ].map(m => (
                            <div key={m.label}>
                              <div style={{ fontSize: 10, color: BRAND.muted }}>{m.label}</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </ScreenMock>
          </div>

          {/* ROI Calculator */}
          <div style={{ opacity: roiOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 24 }}>ROI Calculator — DCF Analysis</div>
                <div style={{ display: "flex", gap: 40 }}>
                  {/* Sliders */}
                  <div style={{ flex: 1 }}>
                    {[
                      { label: "Purchase Price", val: "$12,500,000", pct: 62 },
                      { label: "Equity (LTV 65%)", val: "$4,375,000", pct: 35 },
                      { label: "Hold Period", val: "7 years", pct: 70 },
                      { label: "Exit Cap Rate", val: "6.25%", pct: 45 },
                    ].map((s, i) => (
                      <FadeIn key={s.label} delay={10 + i * 8}>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontSize: 13, color: BRAND.muted }}>{s.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.white }}>{s.val}</div>
                          </div>
                          <div style={{ height: 6, background: BRAND.border, borderRadius: 99, position: "relative" }}>
                            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${s.pct}%`, background: `linear-gradient(to right, ${BRAND.accent}, ${BRAND.blue})`, borderRadius: 99 }} />
                            <div style={{ position: "absolute", top: -5, left: `${s.pct}%`, width: 16, height: 16, borderRadius: 99, background: BRAND.white, border: `3px solid ${BRAND.accent}`, transform: "translateX(-50%)" }} />
                          </div>
                        </div>
                      </FadeIn>
                    ))}
                  </div>

                  {/* Live results */}
                  <div style={{ width: 280 }}>
                    <FadeIn delay={20}>
                      <div style={{ background: BRAND.surface, borderRadius: 16, padding: "28px", border: `1px solid ${BRAND.border}`, textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: BRAND.muted, marginBottom: 8 }}>Equity IRR</div>
                        <div style={{ fontSize: 56, fontWeight: 900, color: BRAND.accent, lineHeight: 1 }}>
                          {irrVal.toFixed(1)}%
                        </div>
                        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BRAND.border}` }}>
                          <div style={{ fontSize: 13, color: BRAND.muted, marginBottom: 6 }}>Equity Multiple</div>
                          <div style={{ fontSize: 36, fontWeight: 800, color: BRAND.green }}>{equityVal.toFixed(1)}x</div>
                        </div>
                      </div>
                    </FadeIn>
                  </div>
                </div>
              </div>
            </ScreenMock>
            <Callout text="Live DCF — adjusts in real time" delay={40} style={{ position: "absolute", top: -20, right: 60 }} />
          </div>

          {/* Lender Portal */}
          <div style={{ opacity: lenderOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>Lender Portal</div>
                {[
                  { lender: "Pacific Capital Bank", commitment: "$18.5M", drawn: "$12.4M", compliance: 94, status: "Active" },
                  { lender: "Westbrook CMBS Fund", commitment: "$8.2M", drawn: "$8.2M", compliance: 88, status: "Active" },
                  { lender: "Harbor Real Estate Credit", commitment: "$5.0M", drawn: "$1.8M", compliance: 100, status: "Active" },
                ].map((l, i) => (
                  <FadeIn key={l.lender} delay={10 + i * 15}>
                    <div style={{ background: BRAND.surface, borderRadius: 12, padding: "18px 20px", marginBottom: 12, border: `1px solid ${BRAND.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.white }}>{l.lender}</div>
                          <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 2 }}>Commitment: {l.commitment} · Drawn: {l.drawn}</div>
                        </div>
                        <Badge label={l.status} color={BRAND.green} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 12, color: BRAND.muted, width: 100 }}>Compliance</div>
                        <div style={{ flex: 1 }}><ProgressBar pct={l.compliance} color={l.compliance >= 95 ? BRAND.green : l.compliance >= 85 ? BRAND.yellow : BRAND.red} delay={20 + i * 15} height={8} /></div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: l.compliance >= 95 ? BRAND.green : BRAND.yellow }}>{l.compliance}%</div>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </ScreenMock>
          </div>
        </div>
      </div>

      <LowerThird module="SiteSync Vault" title="Investment Intelligence" delay={5} />
    </div>
  );
};
