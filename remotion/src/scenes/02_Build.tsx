import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BRAND } from "../components/tokens";
import { FadeIn, SlideIn, Badge, ProgressBar, Callout, ScreenMock, LowerThird, Counter } from "../components/Shared";

const GanttBar: React.FC<{ label: string; start: number; width: number; color: string; delay: number; pct?: number }> = ({
  label, start, width, color, delay, pct = 60,
}) => {
  const frame = useCurrentFrame();
  const animated = interpolate(frame - delay, [0, 30], [0, width], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <div style={{ width: 160, fontSize: 13, color: BRAND.muted, textAlign: "right", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 28, position: "relative", background: BRAND.border, borderRadius: 6, overflow: "visible" }}>
        <div style={{
          position: "absolute", left: `${start}%`, width: `${animated}%`, height: "100%",
          background: `linear-gradient(to right, ${color}, ${color}bb)`,
          borderRadius: 6, overflow: "hidden",
        }}>
          <div style={{ width: `${pct}%`, height: "100%", background: `${color}ff`, opacity: 0.9 }} />
        </div>
      </div>
    </div>
  );
};

const RFIRow: React.FC<{ num: string; subject: string; priority: string; status: string; delay: number }> = ({
  num, subject, priority, status, delay,
}) => {
  const priorityColor = priority === "High" ? BRAND.red : priority === "Medium" ? BRAND.yellow : BRAND.muted;
  const statusColor = status === "Open" ? BRAND.blue : status === "In Review" ? BRAND.yellow : BRAND.green;
  return (
    <FadeIn delay={delay}>
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: "10px 16px",
        borderBottom: `1px solid ${BRAND.border}`,
      }}>
        <div style={{ width: 90, fontSize: 12, fontFamily: "monospace", color: BRAND.muted }}>{num}</div>
        <div style={{ flex: 1, fontSize: 14, color: BRAND.white }}>{subject}</div>
        <Badge label={priority} color={priorityColor} />
        <Badge label={status} color={statusColor} />
      </div>
    </FadeIn>
  );
};

export const BuildModule: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Screen slides
  const showGantt = frame < 120;
  const showRFIs = frame >= 120 && frame < 210;
  const showCO = frame >= 210 && frame < 300;
  const showPunch = frame >= 300;

  const ganttOpacity = interpolate(frame, [0, 15, 105, 120], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rfiOpacity = interpolate(frame, [120, 135, 195, 210], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const coOpacity = interpolate(frame, [210, 225, 285, 300], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const punchOpacity = interpolate(frame, [300, 315], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CO approved badge
  const badgeScale = spring({ frame: frame - 240, fps, config: { damping: 12, stiffness: 120 }, from: 0, to: 1 });

  return (
    <div style={{ width: 1920, height: 1080, background: BRAND.bg, fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>

      {/* BG glow */}
      <div style={{ position: "absolute", top: -200, left: -200, width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.blue}16, transparent 70%)` }} />

      <div style={{ display: "flex", height: "100%", gap: 60, padding: "60px 80px", alignItems: "flex-start" }}>

        {/* Left: headline */}
        <div style={{ width: 420, flexShrink: 0, paddingTop: 40 }}>
          <FadeIn>
            <div style={{ fontSize: 13, color: BRAND.blue, fontWeight: 700, letterSpacing: 4, marginBottom: 12, textTransform: "uppercase" }}>SiteSync Build</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: BRAND.white, lineHeight: 1.1, marginBottom: 24 }}>
              Field-to-<span style={{ color: BRAND.blue }}>file</span><br />in seconds.
            </div>
          </FadeIn>
          <FadeIn delay={10}>
            <div style={{ fontSize: 18, color: BRAND.muted, lineHeight: 1.7, marginBottom: 40 }}>
              Full construction workflow from groundbreaking to punch list — one unified module.
            </div>
          </FadeIn>

          {/* Feature list */}
          {[
            { icon: "📅", label: "Live Gantt Schedule", delay: 20 },
            { icon: "📋", label: "RFI Management", delay: 30 },
            { icon: "🔄", label: "Change Order Approval", delay: 40 },
            { icon: "📝", label: "Daily Reports", delay: 50 },
            { icon: "✅", label: "Punch List Closeout", delay: 60 },
          ].map(f => (
            <FadeIn key={f.label} delay={f.delay}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, fontSize: 16 }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ color: BRAND.white, fontWeight: 500 }}>{f.label}</span>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Right: rotating screen demos */}
        <div style={{ flex: 1 }}>

          {/* Gantt Chart */}
          <div style={{ opacity: ganttOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 6 }}>Project Schedule — Gantt View</div>
                <div style={{ fontSize: 13, color: BRAND.muted, marginBottom: 20 }}>Q1–Q3 2026 · 4 active projects</div>

                {/* Month labels */}
                <div style={{ display: "flex", paddingLeft: 172, marginBottom: 8 }}>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"].map(m => (
                    <div key={m} style={{ flex: 1, fontSize: 11, color: BRAND.muted, textAlign: "center" }}>{m}</div>
                  ))}
                </div>

                <GanttBar label="Harbor View Tower" start={0} width={55} color={BRAND.blue} delay={10} pct={70} />
                <GanttBar label="Westside Mixed-Use" start={15} width={45} color={BRAND.green} delay={18} pct={40} />
                <GanttBar label="Eastport Lofts" start={30} width={60} color={BRAND.accent} delay={26} pct={20} />
                <GanttBar label="Marina District HQ" start={5} width={80} color={BRAND.yellow} delay={34} pct={85} />

                {/* Today marker */}
                <div style={{ position: "absolute", left: `calc(172px + 35%)`, top: 68, height: 160, width: 2, background: `${BRAND.blue}aa`, borderRadius: 1 }} />
              </div>
            </ScreenMock>
            <Callout text="Real-time Gantt with today marker" delay={45} style={{ position: "absolute", top: -20, right: 60 }} />
          </div>

          {/* RFI List */}
          <div style={{ opacity: rfiOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "24px 28px", background: BRAND.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white }}>RFIs</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Badge label="12 Open" color={BRAND.blue} />
                    <Badge label="4 In Review" color={BRAND.yellow} />
                    <Badge label="8 Answered" color={BRAND.green} />
                  </div>
                </div>
                <RFIRow num="RFI-0042" subject="Roof drain sizing clarification — Bldg C" priority="High" status="Open" delay={10} />
                <RFIRow num="RFI-0041" subject="Structural steel connection detail" priority="High" status="In Review" delay={18} />
                <RFIRow num="RFI-0040" subject="MEP coordination ceiling plenum" priority="Medium" status="Open" delay={26} />
                <RFIRow num="RFI-0039" subject="Exterior cladding panel fastener spec" priority="Low" status="Answered" delay={34} />
                <RFIRow num="RFI-0038" subject="Foundation waterproofing membrane type" priority="Medium" status="Open" delay={42} />
              </div>
            </ScreenMock>
            <Callout text="Filter by project, priority & status" delay={55} style={{ position: "absolute", bottom: -20, right: 100 }} />
          </div>

          {/* Change Order */}
          <div style={{ opacity: coOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "28px", background: BRAND.bg }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, marginBottom: 20 }}>Change Orders</div>
                {/* CO Row */}
                <div style={{ background: BRAND.surface, borderRadius: 12, padding: "20px 24px", border: `1px solid ${BRAND.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: "monospace", color: BRAND.muted, marginBottom: 4 }}>CO-0018</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: BRAND.white }}>Additional MEP rerouting — Level 4</div>
                      <div style={{ fontSize: 14, color: BRAND.muted, marginTop: 6 }}>Unforeseen Conditions · Requested by: J. Martinez</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: BRAND.white }}>$84,500</div>
                      <div style={{ fontSize: 14, color: BRAND.yellow }}>+6 days impact</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{
                      transform: `scale(${badgeScale})`,
                      background: `${BRAND.green}22`, color: BRAND.green,
                      border: `2px solid ${BRAND.green}66`, borderRadius: 20,
                      padding: "6px 20px", fontSize: 14, fontWeight: 700,
                      boxShadow: `0 0 20px ${BRAND.green}44`,
                    }}>✓ Approved</div>
                    <div style={{ fontSize: 13, color: BRAND.muted }}>Budget updated automatically</div>
                  </div>
                </div>
              </div>
            </ScreenMock>
            <Callout text="Approval auto-updates budget" delay={30} style={{ position: "absolute", bottom: -20, left: 60 }} />
          </div>

          {/* Punch List */}
          <div style={{ opacity: punchOpacity, position: "absolute", right: 80, top: 60, width: 1100 }}>
            <ScreenMock>
              <div style={{ padding: "28px", background: BRAND.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.white }}>Punch List</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 13, color: BRAND.muted }}>Completion</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: BRAND.green }}><Counter end={73} delay={20} />%</div>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <ProgressBar pct={73} color={BRAND.green} delay={15} height={12} />
                </div>
                {[
                  { num: "PL-031", item: "Touch-up paint — Lobby east wall", pri: "Medium", done: true },
                  { num: "PL-030", item: "HVAC grille alignment — Suite 402", pri: "High", done: false },
                  { num: "PL-029", item: "Missing door hardware — Stairwell B", pri: "High", done: false },
                  { num: "PL-028", item: "Caulk gap at window sill — Unit 210", pri: "Low", done: true },
                ].map((item, i) => (
                  <FadeIn key={item.num} delay={25 + i * 8}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "10px 0",
                      borderBottom: `1px solid ${BRAND.border}`, opacity: item.done ? 0.5 : 1,
                    }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: item.done ? BRAND.green : "transparent", border: `2px solid ${item.done ? BRAND.green : BRAND.border}`, flexShrink: 0 }}>
                        {item.done && <span style={{ color: "white", fontSize: 14, lineHeight: "20px", paddingLeft: 3 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: BRAND.muted, width: 70 }}>{item.num}</div>
                      <div style={{ flex: 1, fontSize: 14, color: BRAND.white, textDecoration: item.done ? "line-through" : "none" }}>{item.item}</div>
                      <Badge label={item.pri} color={item.pri === "High" ? BRAND.red : item.pri === "Medium" ? BRAND.yellow : BRAND.muted} />
                    </div>
                  </FadeIn>
                ))}
              </div>
            </ScreenMock>
          </div>
        </div>
      </div>

      <LowerThird module="SiteSync Build" title="Construction Management" delay={5} />
    </div>
  );
};
