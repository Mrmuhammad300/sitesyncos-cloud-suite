import { useEffect, useState } from "react";
import * as THREE from "three";
import { useTheme } from "@/hooks/useTheme";

/**
 * three.js needs literal colors, so we resolve the design tokens from CSS
 * variables at runtime. The palette re-reads whenever the theme flips, so a
 * WebGL scene follows light/dark exactly like the DOM does.
 */
const TOKENS = {
  background: "--background",
  foreground: "--foreground",
  muted: "--muted-foreground",
  surface1: "--surface-1",
  surface2: "--surface-2",
  surface3: "--surface-3",
  border: "--border",
  primary: "--primary",
  data: "--data",
  destructive: "--destructive",
  warning: "--warning",
  success: "--success",
  info: "--info",
  spatial: "--mod-spatial",
  vault: "--mod-vault",
  ai: "--mod-ai",
} as const;

type TokenKey = keyof typeof TOKENS;

/** Tasteful fallbacks that match the dark token set. */
const FALLBACK: Record<TokenKey, string> = {
  background: "#0b0c10",
  foreground: "#f0ede8",
  muted: "#8d909c",
  surface1: "#111216",
  surface2: "#16171c",
  surface3: "#1d1e24",
  border: "#212329",
  primary: "#ff7a29",
  data: "#2dd4ee",
  destructive: "#f05252",
  warning: "#fbbf24",
  success: "#34d399",
  info: "#60a5fa",
  spatial: "#5aa2f7",
  vault: "#a78bfa",
  ai: "#e879f9",
};

export interface ScenePalette extends Record<TokenKey, string> {
  dark: boolean;
  /** Canvas clear color — sits a touch above the page background. */
  canvas: string;
  grid: string;
  gridSection: string;
  /** Neutral structural concrete / steel. */
  concrete: string;
  slab: string;
  glass: string;
}

const tmp = new THREE.Color();

function readToken(style: CSSStyleDeclaration, key: TokenKey): string {
  const raw = style.getPropertyValue(TOKENS[key]).trim();
  if (!raw) return FALLBACK[key];
  const [h, s, l] = raw.split(/\s+/);
  try {
    tmp.setStyle(`hsl(${parseFloat(h)}, ${s}, ${l})`);
    return `#${tmp.getHexString()}`;
  } catch {
    return FALLBACK[key];
  }
}

export function mix(a: string, b: string, t: number): string {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

export function readPalette(): ScenePalette {
  const dark = typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true;
  const style = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const base = Object.fromEntries(
    (Object.keys(TOKENS) as TokenKey[]).map((k) => [k, style ? readToken(style, k) : FALLBACK[k]]),
  ) as Record<TokenKey, string>;

  const canvas = dark ? mix(base.background, base.surface1, 0.6) : mix(base.surface2, base.background, 0.4);
  return {
    ...base,
    dark,
    canvas,
    grid: mix(canvas, base.foreground, dark ? 0.08 : 0.1),
    gridSection: mix(canvas, base.foreground, dark ? 0.18 : 0.22),
    concrete: mix(base.muted, base.foreground, dark ? 0.15 : 0),
    slab: dark ? mix(base.surface3, base.foreground, 0.28) : mix(base.surface3, base.muted, 0.35),
    glass: base.data,
  };
}

/** Live palette for WebGL scenes; re-resolves on theme change. */
export function useScenePalette(): ScenePalette {
  const { resolvedTheme } = useTheme();
  const [palette, setPalette] = useState<ScenePalette>(readPalette);
  useEffect(() => {
    // ThemeProvider toggles the root class in its own effect; read after it lands.
    const id = requestAnimationFrame(() => setPalette(readPalette()));
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);
  return palette;
}
