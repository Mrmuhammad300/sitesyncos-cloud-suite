import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "../components/tokens";
import { FadeIn, Badge, ProgressBar, Callout, ScreenMock, LowerThird, Counter } from "../components/Shared";

const UtilBar: React.FC<{ label: string; pct: number; delay: number }> = ({ label, pct, delay }) => {
  const color = pct >= 100 ? BRAND.red : pct >= 80 ? BRAND.yellow : BRAND.green;
  return (
    <FadeIn delay={delay}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 13, color: BRAND.white }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</div>
        </div>
        <ProgressBar pct={pct} color={color} delay={delay} height={10} />
      </div>
    </FadeIn>
  );
};

export const OpsModule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const showCost = frame < 120;
  const showWO = frame >= 120 && frame < 210;
  const showTenant = frame >= 210 && frame < 300;
  const showDraw = frame >= 300;

  const costOpacity = interpolate(frame, [0, 15, 105, 120], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const woOpacity = interpolate(frame, [120, 135, 195, 210], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tenantOpacity = interpolate(frame, [210, 225, 285, 300], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drawOpacity = interpolate(frame, [300, 315], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Approved badge
  const approvedScale = spring({ frame: frame - 330, fps, config: { damping: 12, stiffness: 120 }, from: 0, to: 1 });

  return (
    <div style={{ width: 1920, height: 1080, background: BRAND.bg, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", bottom: -200, right: -100, width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.green}14, transparent 70%)` }} />

      <div style={{ display: "flex", height: "100%", gap: 60, padding: "60px 80px", alignItems: "flex-start" }}>

        {/* Left panel */}
        <div style={{ width: 420, flexShrink: 0, paddingTop: 40 }}>
          <FadeIn>
            <div style={{ fontSize: 13, color: BRAND.green, fontWeight: 700, letterSpacing: 4, marginBottom: 12, textTransform: "uppercase" }}>SiteSync Ops</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: BRAND.white, lineHeight: 1.1, marginBottom: 24 }}>
              Run it.<br />
              <span style={{ color: BRAND.green }}>Profitably.</span>
            </div>
          </FadeIn>
          <FadeIn delay={10}>
            <div style={{ fontSize: 18, color: BRAND.muted, lineHeight: 1.7, marginBottom: 40 }}>
              Property operations, cost tracking, and capital management — all in one dashboard.
            </div>
          </FadeIn>
          {[
            { icon: "📊", label: "Cost Dashboard", delay: 20 },
            { icon: "🔧", label: "Work Orders", delay: 30 },
            { icon: "🏠", label: "Tenant Management", delay: 40 },
            { icon: "💳", label: "Draw Requests", delay: 50 },
            { icon: "📁", label: "Document Vault", delay: 60 },
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

          {/* Cost Dashboard */}
          <div style={{ opacity: costOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>Cost Dashboard</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
                  {[
                    { label: "Total Budget", val: "$12.4M", color: BRAND.white },
                    { label: "Total Spent", val: "$8.4M", color: BRAND.yellow },
                    { label: "Remaining", val: "$4.0M", color: BRAND.green },
                  ].map((k, i) => (
                    <FadeIn key={k.label} delay={10 + i * 8}>
                      <div style={{ background: BRAND.surface, borderRadius: 10, padding: "16px 20px", border: `1px solid ${BRAND.border}` }}>
                        <div style={{ fontSize: 12, color: BRAND.muted, marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</div>
                      </div>
                    </FadeIn>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 2 }}>Budget by Category</div>
                <UtilBar label="Structural & Foundation" pct={92} delay={18} />
                <UtilBar label="MEP Systems" pct={78} delay={24} />
                <UtilBar label="Finishes & Fixtures" pct={45} delay={30} />
                <UtilBar label="Site Work & Utilities" pct={107} delay={36} />
              </div>
            </ScreenMock>
            <Callout text="Overrun alerts at 80% & 100%" delay={50} style={{ position: "absolute", top: -20, right: 60 }} />
          </div>

          {/* Work Orders */}
          <div style={{ opacity: woOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>Work Orders</div>
                {[
                  { num: "WO-041", title: "HVAC filter replacement — Floor 3", pri: "High", status: "In Progress" },
                  { num: "WO-040", title: "Lobby elevator button panel repair", pri: "Emergency", status: "Open" },
                  { num: "WO-039", title: "Parking lot light fixture replacement", pri: "Medium", status: "Completed" },
                  { num: "WO-038", title: "Roof membrane inspection — Section B", pri: "Low", status: "Open" },
                ].map((w, i) => (
                  <FadeIn key={w.num} delay={12 + i * 10}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${BRAND.border}` }}>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: BRAND.muted, width: 72 }}>{w.num}</div>
                      <div style={{ flex: 1, fontSize: 14, color: BRAND.white }}>{w.title}</div>
                      <Badge label={w.pri} color={w.pri === "Emergency" ? BRAND.red : w.pri === "High" ? BRAND.yellow : w.pri === "Medium" ? BRAND.accent : BRAND.muted} />
                      <Badge label={w.status} color={w.status === "Completed" ? BRAND.green : w.status === "In Progress" ? BRAND.yellow : BRAND.blue} />
                    </div>
                  </FadeIn>
                ))}
              </div>
            </ScreenMock>
          </div>

          {/* Tenants */}
          <div style={{ opacity: tenantOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white }}>Tenants</div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.white }}><Counter end={34} delay={10} /></div>
                      <div style={{ fontSize: 11, color: BRAND.muted }}>Active</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.green }}>$<Counter end={218} delay={15} />K</div>
                      <div style={{ fontSize: 11, color: BRAND.muted }}>Monthly Rev</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.yellow }}><Counter end={4} delay={20} /></div>
                      <div style={{ fontSize: 11, color: BRAND.muted }}>Expiring 90d</div>
                    </div>
                  </div>
                </div>
                {[
                  { name: "Apex Software Inc.", property: "Harbor View Tower", unit: "Ste 1200", rent: "$18,500", end: "Mar 2026", status: "Active" },
                  { name: "Pacific Dental Group", property: "Westside Mixed-Use", unit: "Ste 101", rent: "$6,200", end: "Jan 2026", status: "Active" },
                  { name: "Metro Fitness LLC", property: "Harbor View Tower", unit: "Ste 600", rent: "$22,000", end: "May 2027", status: "Active" },
                ].map((t, i) => (
                  <FadeIn key={t.name} delay={20 + i * 10}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0", borderBottom: `1px solid ${BRAND.border}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.white }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: BRAND.muted }}>{t.property} · {t.unit}</div>
                      </div>
                      <div style={{ fontSize: 14, fontFamily: "monospace", color: BRAND.green }}>{t.rent}/mo</div>
                      <div style={{ fontSize: 12, color: BRAND.muted }}>Ends {t.end}</div>
                      <Badge label={t.status} color={BRAND.green} />
                    </div>
                  </FadeIn>
                ))}
              </div>
            </ScreenMock>
          </div>

          {/* Draw Request */}
          <div style={{ opacity: drawOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>Draw Requests</div>
                <div style={{ background: BRAND.surface, borderRadius: 12, padding: "24px", border: `1px solid ${BRAND.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: "monospace", color: BRAND.muted }}>DRAW-014</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: BRAND.white, marginTop: 4 }}>Progress Draw — Harbor View Tower</div>
                      <div style={{ fontSize: 14, color: BRAND.muted, marginTop: 6 }}>Submitted by: Sarah Chen · Dec 12, 2025</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: BRAND.white }}>$1.2M</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{
                      transform: `scale(${approvedScale})`,
                      background: `${BRAND.green}22`, color: BRAND.green,
                      border: `2px solid ${BRAND.green}66`, borderRadius: 20,
                      padding: "8px 24px", fontSize: 16, fontWeight: 700,
                      boxShadow: `0 0 30px ${BRAND.green}44`,
                    }}>✓ Approved — Funds Released</div>
                  </div>
                </div>
              </div>
            </ScreenMock>
            <Callout text="Full draw approval workflow" delay={25} style={{ position: "absolute", bottom: -20, right: 100 }} />
          </div>
        </div>
      </div>

      <LowerThird module="SiteSync Ops" title="Property Operations" delay={5} />
    </div>
  );
};
