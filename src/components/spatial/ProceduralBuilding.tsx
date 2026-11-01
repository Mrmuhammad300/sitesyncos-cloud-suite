import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BuildingSpec } from "@/lib/spatial/buildingSpec";
import { buildGeometry, type Box, type BuildingGeometry, type Discipline, type MaterialKey, type Part } from "@/lib/spatial/buildingGeometry";
import { mix, type ScenePalette } from "./sceneTheme";

export type RenderMode = "shaded" | "wireframe" | "xray";

export interface PickedElement {
  id: string;
  label: string;
  level: string;
  discipline: Discipline;
}

/** Real-world metres → scene units. Keeps a 60 m tower at ~15 units. */
export const SCENE_SCALE = 0.25;

interface MaterialSpec {
  color: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

function materialSpecs(p: ScenePalette, s: BuildingSpec): Record<MaterialKey, MaterialSpec> {
  const d = p.dark;
  const concrete = d ? "#8e9198" : "#c9c6bf";
  const timber = d ? "#b8875a" : "#c99d6c";
  const steel = d ? "#7d8794" : "#8f99a6";
  const cladding: Record<BuildingSpec["use"], string> = {
    residential: d ? "#cfc6b6" : "#e2d9c8",
    hotel: d ? "#c9c0b0" : "#ddd3c2",
    medical: d ? "#9a614b" : "#b0705a",
    education: d ? "#a8735a" : "#bf8466",
    office: d ? "#a9adb5" : "#c3c7ce",
    retail: d ? "#b4aea4" : "#d0c9bd",
    mixed: d ? "#b9b2a6" : "#d6cfc2",
    industrial: d ? "#7e8792" : "#a7b0ba",
  };
  const glass = d ? "#7fb0c8" : "#9cc6d8";
  return {
    slab: { color: d ? mix(concrete, "#ffffff", 0.08) : "#d6d3cc", roughness: 0.85 },
    roof: { color: d ? "#6f727a" : "#b7b4ad", roughness: 0.9 },
    column: { color: s.structure === "timber" ? timber : s.structure === "steel" ? steel : concrete, roughness: 0.7, metalness: s.structure === "steel" ? 0.4 : 0 },
    core: { color: d ? "#7b7e86" : "#bdbab3", roughness: 0.9 },
    glass: { color: glass, opacity: d ? 0.55 : 0.62, metalness: 0.35, roughness: 0.12, emissive: d ? "#9fc6dc" : "#000000", emissiveIntensity: d ? 0.12 : 0 },
    storefront: { color: d ? "#7fa7b8" : "#a9cbd8", opacity: 0.38, metalness: 0.5, roughness: 0.06, emissive: "#ffcf8a", emissiveIntensity: d ? 0.35 : 0.08 },
    mullion: { color: d ? "#454a54" : "#5f6670", metalness: 0.6, roughness: 0.35 },
    // Timber buildings expose the slab edge as a warm timber band.
    spandrel: s.structure === "timber" ? { color: timber, roughness: 0.7 } : { color: d ? "#3a3f48" : "#9aa1ab", metalness: 0.3, roughness: 0.5 },
    cladding: { color: cladding[s.use], roughness: 0.8 },
    window: { color: d ? "#22394a" : "#3c5d72", metalness: 0.7, roughness: 0.1, emissive: "#ffd39a", emissiveIntensity: d ? 0.12 : 0 },
    fin: { color: s.structure === "timber" ? timber : d ? "#b8bec7" : "#d3d7dd", roughness: 0.6 },
    balcony: { color: d ? "#a3a6ad" : "#d4d1ca", roughness: 0.8 },
    rail: { color: glass, opacity: 0.35, metalness: 0.5, roughness: 0.05 },
    parapet: { color: d ? "#80838b" : "#c2bfb8", roughness: 0.85 },
    plant: { color: d ? "#9aa1ab" : "#aab1ba", metalness: 0.45, roughness: 0.4 },
    green: { color: d ? "#4b7f48" : "#6aa063", roughness: 1 },
    duct: { color: p.vault, roughness: 0.5, metalness: 0.3 },
    pipe: { color: p.data, roughness: 0.4, metalness: 0.3 },
    tray: { color: p.warning, roughness: 0.5 },
    pad: { color: d ? mix(p.canvas, "#ffffff", 0.06) : mix(p.canvas, "#000000", 0.05), roughness: 1 },
    paving: { color: d ? "#3a3c43" : "#d9d4ca", roughness: 0.95 },
    road: { color: d ? "#1e2025" : "#5a5d64", roughness: 0.95 },
    trunk: { color: "#6b4e36", roughness: 1 },
    canopy: { color: d ? "#3f7448" : "#5c9a5f", roughness: 1 },
    awning: { color: d ? "#3b3f47" : "#6d737c", roughness: 0.4, metalness: 0.5, emissive: p.primary, emissiveIntensity: 0.12 },
  };
}

const GEOMETRY = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.IcosahedronGeometry(0.5, 1),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
};

interface PartMeshProps {
  part: Part;
  material: THREE.Material;
  count: number;
  onPick?: (box: Box, part: Part, index: number) => void;
  onHover?: (hovering: boolean) => void;
}

function PartMesh({ part, material, count, onPick, onHover }: PartMeshProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const shadows = part.discipline === "structural" || part.discipline === "architectural";

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    part.boxes.forEach((b, i) => {
      m.compose(new THREE.Vector3(...b.p), q, new THREE.Vector3(...b.s));
      mesh.setMatrixAt(i, m);
    });
    mesh.count = Math.min(count, part.boxes.length);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [part, count]);

  return (
    <instancedMesh
      ref={ref}
      // Material is a prop (not a constructor arg) so theme/mode changes don't recreate the mesh.
      args={[GEOMETRY[part.shape ?? "box"], undefined, part.boxes.length]}
      material={material}
      castShadow={shadows && !(material as THREE.MeshStandardMaterial).transparent}
      receiveShadow
      onClick={onPick ? (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) onPick(part.boxes[e.instanceId], part, e.instanceId);
      } : undefined}
      onPointerOver={onPick ? (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover?.(true); } : undefined}
      onPointerOut={onPick ? () => onHover?.(false) : undefined}
    />
  );
}

export interface ProceduralBuildingProps {
  spec: BuildingSpec;
  palette: ScenePalette;
  mode?: RenderMode;
  /** Disciplines to show; omit to show all. */
  visible?: Partial<Record<Discipline, boolean>>;
  /** 0–1: reveal the building bottom-up (construction animation). */
  progress?: number;
  selectedId?: string | null;
  onSelect?: (el: PickedElement) => void;
  /** Slow idle sway, for hero previews. */
  sway?: boolean;
}

/** Highlight box drawn over the picked element. */
function SelectionHalo({ box, color }: { box: Box; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.35 + Math.sin(clock.getElapsedTime() * 4) * 0.15;
  });
  return (
    <group>
      <mesh ref={ref} position={box.p} scale={box.s.map((v) => v + 0.15) as [number, number, number]}>
        <boxGeometry />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <lineSegments position={box.p} scale={box.s.map((v) => v + 0.2) as [number, number, number]}>
        <edgesGeometry args={[GEOMETRY.box]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
}

export function ProceduralBuilding({ spec, palette, mode = "shaded", visible, progress = 1, selectedId, onSelect, sway }: ProceduralBuildingProps) {
  const geo: BuildingGeometry = useMemo(() => buildGeometry(spec), [spec]);
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const [, setHover] = useState(false);
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6), []);

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  // Reveal: clip everything above the current construction height. `progress`
  // is a target — the actual height eases toward it every frame.
  const current = useRef(progress);
  const ring = useRef<THREE.Mesh>(null);
  const top = geo.height + 6;
  useFrame((_, dt) => {
    // Rise steadily (≈ 5 s to top out), but settle fast once complete.
    const rate = progress >= 1 && current.current > 0.6 ? 2.5 : 0.45;
    current.current += (progress - current.current) * Math.min(1, dt * rate);
    const p = current.current;
    // Clipping planes live in world space; the building group is scaled by SCENE_SCALE.
    clipPlane.constant = p >= 0.995 ? 1e6 : Math.max(0.01, p * top * SCENE_SCALE);
    if (ring.current) {
      ring.current.visible = p > 0.005 && p < 0.995;
      ring.current.position.y = p * top;
    }
  });

  const materials = useMemo(() => {
    const specs = materialSpecs(palette, spec);
    const out = {} as Record<MaterialKey, THREE.MeshStandardMaterial>;
    for (const [k, m] of Object.entries(specs) as [MaterialKey, MaterialSpec][]) {
      const xray = mode === "xray";
      const baseOpacity = m.opacity ?? 1;
      const opacity = xray ? Math.min(baseOpacity, k === "glass" || k === "storefront" || k === "rail" ? 0.06 : 0.16) : baseOpacity;
      out[k] = new THREE.MeshStandardMaterial({
        color: m.color,
        roughness: m.roughness ?? 0.7,
        metalness: m.metalness ?? 0,
        emissive: new THREE.Color(m.emissive ?? "#000000"),
        emissiveIntensity: m.emissiveIntensity ?? 0,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1,
        wireframe: mode === "wireframe",
        side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
        clippingPlanes: [clipPlane],
        clipShadows: true,
      });
    }
    return out;
  }, [palette, spec, mode, clipPlane]);

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  useFrame(({ clock }) => {
    if (sway && group.current) group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.12) * 0.08;
  });

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const [key, idx] = selectedId.split("#");
    const part = geo.parts.find((p) => p.key === key);
    return part?.boxes[Number(idx)] ?? null;
  }, [selectedId, geo]);

  return (
    <group ref={group} name="building" scale={SCENE_SCALE}>
      {geo.parts.map((part) =>
        visible && visible[part.discipline] === false ? null : (
          <PartMesh
            key={part.key}
            part={part}
            material={materials[part.material]}
            count={part.boxes.length}
            onHover={(h) => {
              setHover(h);
              document.body.style.cursor = h ? "pointer" : "";
            }}
            onPick={onSelect ? (box, p, i) => onSelect({ id: `${p.key}#${i}`, label: box.label, level: box.level, discipline: p.discipline }) : undefined}
          />
        ),
      )}
      {selected && <SelectionHalo box={selected} color={palette.primary} />}
      {/* Construction plane that rides the reveal height. */}
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[geo.radius * 0.55, geo.radius * 0.58, 64]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Scene-unit framing info for a spec (camera distance, orbit target, grid size). */
export function buildingFraming(spec: BuildingSpec) {
  const g = buildGeometry(spec);
  const height = g.height * SCENE_SCALE;
  const radius = g.radius * SCENE_SCALE;
  // Fit the taller of height / site width inside a 42° vertical FOV with margin.
  const reach = Math.max(radius * 2.4, height * 2.15, 12);
  return {
    height,
    radius,
    target: [0, height * 0.4, 0] as [number, number, number],
    distance: reach,
    levels: g.levels,
    elementCount: g.parts.reduce((s, p) => s + p.boxes.length, 0),
  };
}
