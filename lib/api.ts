const BASE = "http://localhost:8000";

export async function uploadScan(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload-scan`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSlice(plane: string, index: number) {
  const res = await fetch(`${BASE}/get-slice?plane=${plane}&index=${index}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadMesh(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload-mesh`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function transformMesh(rotation: number[][], translation: number[]) {
  const res = await fetch(`${BASE}/transform-mesh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rotation, translation }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function computeBvtv() {
  const res = await fetch(`${BASE}/compute-bvtv`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getBoneSurface() {
  const res = await fetch(`${BASE}/bone-surface`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function exportMeshUrl() {
  return `${BASE}/export-mesh`;
}

export function exportNiftiUrl() {
  return `${BASE}/export-nifti`;
}
