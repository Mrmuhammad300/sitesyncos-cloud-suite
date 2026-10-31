/**
 * Model annotations (notes pinned to BIM elements). Stored per browser in
 * localStorage, keyed by model, so they survive reloads without a backend table.
 */
export interface Annotation {
  id: string;
  modelId: string;
  elementId: string;
  elementLabel: string;
  level: string;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

const KEY = "sitesync-model-annotations";

function readAll(): Annotation[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Annotation[];
  } catch {
    return [];
  }
}

function writeAll(list: Annotation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable */
  }
}

export function listAnnotations(modelId: string): Annotation[] {
  return readAll()
    .filter((a) => a.modelId === modelId)
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.createdAt.localeCompare(a.createdAt));
}

export function addAnnotation(a: Omit<Annotation, "id" | "createdAt" | "resolved">): Annotation {
  const note: Annotation = { ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString(), resolved: false };
  writeAll([note, ...readAll()]);
  return note;
}

export function updateAnnotation(id: string, patch: Partial<Pick<Annotation, "resolved" | "text">>) {
  writeAll(readAll().map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

export function removeAnnotation(id: string) {
  writeAll(readAll().filter((a) => a.id !== id));
}
