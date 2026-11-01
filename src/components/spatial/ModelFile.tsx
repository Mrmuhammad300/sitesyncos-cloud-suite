import { Component, Suspense, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/** File formats the viewer can render directly. */
export function isRenderableModel(url: string | null | undefined): url is string {
  return !!url && /\.(glb|gltf)(\?|#|$)/i.test(url);
}

/**
 * Renders a glTF/GLB file (e.g. Blender output), recentred on the origin,
 * sitting on the ground plane and scaled so its longest side is `fit` units.
 */
function GltfModel({ url, fit = 18, wireframe }: { url: string; fit?: number; wireframe?: boolean }) {
  const { scene } = useGLTF(url);
  const prepared = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (wireframe) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => ((m as THREE.MeshStandardMaterial).wireframe = true));
        }
      }
    });
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = fit / Math.max(size.x, size.y, size.z, 0.001);
    return { root, scale, offset: new THREE.Vector3(-center.x, -box.min.y, -center.z) };
  }, [scene, fit, wireframe]);

  return (
    <group scale={prepared.scale}>
      <primitive object={prepared.root} position={prepared.offset} />
    </group>
  );
}

class LoadBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    this.props.onError?.(e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Load a model file, falling back to `fallback` (usually the procedural building) if it can't be fetched or parsed. */
export function ModelFile({ url, fallback, fit, wireframe, onError }: { url: string; fallback: ReactNode; fit?: number; wireframe?: boolean; onError?: (e: Error) => void }) {
  return (
    <LoadBoundary key={url} fallback={fallback} onError={onError}>
      <Suspense fallback={fallback}>
        <GltfModel url={url} fit={fit} wireframe={wireframe} />
      </Suspense>
    </LoadBoundary>
  );
}
