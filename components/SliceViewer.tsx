"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSlice } from "@/lib/api";
import { coolwarm } from "@/lib/colormap";
import type { ScanMeta } from "@/types";

interface Props {
  plane: "axial" | "coronal" | "sagittal";
  index: number;
  scan: ScanMeta;
  label: string;
  meshVoxelPoints?: number[][] | null;
  showBoneOverlay?: boolean;
  onTranslate?: (dx: number, dy: number, dz: number) => void;
  onRotate?: (axis: "x"|"y"|"z", angleDeg: number) => void;
}

// Which voxel axes map to canvas X and Y for each plane
const PLANE_MAP = {
  axial:    { cx: 0, cy: 1, depth: 2 },  // canvas(x,y) = voxel(X,Y), depth = Z
  coronal:  { cx: 0, cy: 2, depth: 1 },  // canvas(x,y) = voxel(X,Z), depth = Y
  sagittal: { cx: 1, cy: 2, depth: 0 },  // canvas(x,y) = voxel(Y,Z), depth = X
};

const TRANSLATE_SENSITIVITY = 0.5; // voxels per pixel
const ROTATE_SENSITIVITY    = 0.4; // degrees per pixel
const OVERLAY_DEPTH_RANGE   = 15;  // show mesh points within this many voxels

export default function SliceViewer({
  plane, index, scan, label, meshVoxelPoints,
  showBoneOverlay = true, onTranslate, onRotate,
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rawDataRef = useRef<number[] | null>(null); // store raw pixel values for overlay
  const [error, setError] = useState<string | null>(null);

  // Drag state
  const dragRef = useRef<{ x: number; y: number; button: number } | null>(null);

  // ── Draw CT slice ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchAndDraw() {
      try {
        const slice = await getSlice(plane, index);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width  = slice.width;
        canvas.height = slice.height;

        const ctx = canvas.getContext("2d")!;
        rawDataRef.current = slice.data;
        const imgData = ctx.createImageData(slice.width, slice.height);
        for (let i = 0; i < slice.data.length; i++) {
          const g = slice.data[i];
          imgData.data[i * 4]     = g;
          imgData.data[i * 4 + 1] = g;
          imgData.data[i * 4 + 2] = g;
          imgData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }
    fetchAndDraw();
    return () => { cancelled = true; };
  }, [plane, index, scan]);

  // ── Draw overlay (bone highlight + mesh dots) ────────────────────────────
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !scan) return;

    const { cx, cy, depth } = PLANE_MAP[plane];
    const w = plane === "sagittal" ? scan.dims[1] : scan.dims[0];
    const h = plane === "axial"    ? scan.dims[1] : scan.dims[2];

    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);

    // Bone color overlay
    if (showBoneOverlay && rawDataRef.current) {
      const raw = rawDataRef.current;
      const imgData = ctx.createImageData(w, h);
      // Bone threshold: pixels above 160/255 (~600 HU) get a coolwarm tint
      const BONE_THRESH = 160;
      for (let i = 0; i < raw.length; i++) {
        const g = raw[i];
        if (g > BONE_THRESH) {
          const t = (g - BONE_THRESH) / (255 - BONE_THRESH);
          const [r, gg, b] = coolwarm(t);
          imgData.data[i * 4]     = r;
          imgData.data[i * 4 + 1] = gg;
          imgData.data[i * 4 + 2] = b;
          imgData.data[i * 4 + 3] = 120; // semi-transparent
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Mesh dots
    if (meshVoxelPoints && meshVoxelPoints.length > 0) {
      ctx.fillStyle = "rgba(0, 255, 255, 0.9)";
      for (const pt of meshVoxelPoints) {
        if (Math.abs(pt[depth] - index) > OVERLAY_DEPTH_RANGE) continue;
        ctx.beginPath();
        ctx.arc(pt[cx], pt[cy], 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [meshVoxelPoints, showBoneOverlay, plane, index, scan]);

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { x: e.clientX, y: e.clientY, button: e.button };
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY, button: dragRef.current.button };

    if (dragRef.current.button === 0) {
      // Left drag → translate
      if (!onTranslate) return;
      const vx = dx * TRANSLATE_SENSITIVITY;
      const vy = dy * TRANSLATE_SENSITIVITY;

      if (plane === "axial")    onTranslate( vx,  vy,  0);
      if (plane === "coronal")  onTranslate( vx,   0, vy);
      if (plane === "sagittal") onTranslate(  0,  vx, vy);
    } else if (dragRef.current.button === 2) {
      // Right drag → rotate
      if (!onRotate) return;
      const angle = dx * ROTATE_SENSITIVITY;

      if (plane === "axial")    onRotate("z", angle);
      if (plane === "coronal")  onRotate("y", angle);
      if (plane === "sagittal") onRotate("x", angle);
    }
  }, [plane, onTranslate, onRotate]);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden", borderRadius: 4, cursor: "crosshair" }}
      onMouseDown={onMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={{ position: "absolute", top: 6, left: 8, fontSize: 12, color: "#aaa", zIndex: 2, pointerEvents: "none" }}>
        {label} [{index}]
      </div>

      {error ? (
        <div style={{ color: "red", padding: 8, fontSize: 12 }}>{error}</div>
      ) : (
        <>
          {/* CT slice */}
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          {/* Mesh overlay */}
          <canvas ref={overlayRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
        </>
      )}
    </div>
  );
}
