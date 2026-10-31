import * as THREE from "three";

/**
 * Export a three.js object (e.g. the procedural building group) to a binary
 * glTF (.glb). Instanced meshes are written with EXT_mesh_gpu_instancing, so
 * the file stays compact and opens in Blender, Revit (via plugins), Rhino and
 * any glTF viewer.
 */
export async function exportGlb(object: THREE.Object3D): Promise<Blob> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  const exporter = new GLTFExporter();
  // Clipping planes are a viewer-only effect; strip them from the exported copy.
  const clone = object.clone(true);
  const clean = (m: THREE.Material) => {
    const c = m.clone();
    c.clippingPlanes = null;
    return c;
  };
  clone.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clean) : clean(mesh.material);
  });
  const result = await exporter.parseAsync(clone, { binary: true, onlyVisible: true });
  return new Blob([result as ArrayBuffer], { type: "model/gltf-binary" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "model";
}
