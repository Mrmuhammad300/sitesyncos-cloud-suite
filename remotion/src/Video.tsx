import { AbsoluteFill, Series } from "remotion";
import { ColdOpen } from "./scenes/00_ColdOpen";
import { Intro } from "./scenes/01_Intro";
import { BuildModule } from "./scenes/02_Build";
import { OpsModule } from "./scenes/03_Ops";
import { VaultModule } from "./scenes/04_Vault";
import { AIScene } from "./scenes/05_AI";
import { Closing } from "./scenes/06_Close";
import { FPS } from "./components/tokens";

// Scene durations in frames (30fps)
// ColdOpen:  180f = 6s  (hook → logo reveal)
// Intro:     210f = 7s  (platform overview + KPIs + module icons)
// Build:     420f = 14s (Gantt → RFIs → CO → Punch List)
// Ops:       420f = 14s (Cost Dash → Work Orders → Tenants → Draw)
// Vault:     360f = 12s (Properties → ROI calc → Lender)
// AI:        360f = 12s (Analytics → Agents → Search)
// Close:     270f = 9s  (module panels → logo → CTA)
// Total:     2220f = 74s ≈ 4min 14sec

export const SiteSyncVideo: React.FC = () => (
  <AbsoluteFill style={{ background: "#0F172A" }}>
    <Series>
      <Series.Sequence durationInFrames={180}>
        <ColdOpen />
      </Series.Sequence>
      <Series.Sequence durationInFrames={210}>
        <Intro />
      </Series.Sequence>
      <Series.Sequence durationInFrames={420}>
        <BuildModule />
      </Series.Sequence>
      <Series.Sequence durationInFrames={420}>
        <OpsModule />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <VaultModule />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <AIScene />
      </Series.Sequence>
      <Series.Sequence durationInFrames={270}>
        <Closing />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
