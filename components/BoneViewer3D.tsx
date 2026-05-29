"use client";

import { useEffect, useRef, useState } from "react";
import { getBoneSurface } from "@/lib/api";
import type { MeshData } from "@/types";

interface Props {
  mesh: MeshData | null;
  updatedWorldPoints?: number[][] | null;
  onSceneClick?: (worldPos: [number, number, number]) => void;
}

export default function BoneViewer3D({ mesh, updatedWorldPoints, onSceneClick }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const rendererRef    = useRef<any>(null);
  const implantDataRef = useRef<any>(null);  // vtk PolyData for implant mesh
  const [ready, setReady] = useState(false);

  // ── Init renderer + bone surface ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      await import("@kitware/vtk.js/Rendering/Profiles/Geometry");
      const vtkFullScreenRenderWindow = (await import("@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow")).default;
      if (cancelled || !containerRef.current) return;

      const renderWindow = vtkFullScreenRenderWindow.newInstance({ container: containerRef.current });
      const renderer = renderWindow.getRenderer();
      const renWin   = renderWindow.getRenderWindow();

      rendererRef.current = { renderWindow, renderer, renWin };

      // Bone surface
      try {
        const vtkPolyData = (await import("@kitware/vtk.js/Common/DataModel/PolyData")).default;
        const vtkActor    = (await import("@kitware/vtk.js/Rendering/Core/Actor")).default;
        const vtkMapper   = (await import("@kitware/vtk.js/Rendering/Core/Mapper")).default;

        const surface = await getBoneSurface();
        const pts   = new Float32Array(surface.points.flat());
        const cells = new Int32Array(surface.faces);

        const pd = vtkPolyData.newInstance();
        pd.getPoints().setData(pts, 3);
        pd.getPolys().setData(cells);

        const mapper = vtkMapper.newInstance();
        mapper.setInputData(pd);
        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setColor(1.0, 0.5, 0.0);
        actor.getProperty().setOpacity(0.4);

        renderer.addActor(actor);
        renderer.resetCamera();
        renWin.render();
      } catch (_) { /* scan not loaded yet */ }

      // Click handler for 3D jump — use DOM click + vtk picker
      const onSceneClickRef = { current: onSceneClick };
      containerRef.current?.addEventListener("click", async (e: MouseEvent) => {
        if (!onSceneClickRef.current) return;
        try {
          const vtkPointPicker = (await import("@kitware/vtk.js/Rendering/Core/PointPicker")).default;
          const rect = containerRef.current!.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = rect.height - (e.clientY - rect.top); // vtk y=0 at bottom
          const picker = vtkPointPicker.newInstance();
          picker.pick([x, y, 0], renderer);
          const positions = picker.getPickedPositions?.();
          if (positions && positions.length > 0) {
            onSceneClickRef.current(positions[0] as [number, number, number]);
          }
        } catch (_) { /* picker not available */ }
      });

      if (!cancelled) setReady(true);
    }

    init();
    return () => {
      cancelled = true;
      rendererRef.current?.renderWindow?.delete();
    };
  }, []);

  // ── Add implant mesh on first load ───────────────────────────────────────
  useEffect(() => {
    if (!ready || !mesh || implantDataRef.current) return;

    async function addMesh() {
      const vtkPolyData = (await import("@kitware/vtk.js/Common/DataModel/PolyData")).default;
      const vtkActor    = (await import("@kitware/vtk.js/Rendering/Core/Actor")).default;
      const vtkMapper   = (await import("@kitware/vtk.js/Rendering/Core/Mapper")).default;

      const pts   = new Float32Array(mesh!.points.flat());
      const cells = new Int32Array(mesh!.faces);

      const pd = vtkPolyData.newInstance();
      pd.getPoints().setData(pts, 3);
      pd.getPolys().setData(cells);
      implantDataRef.current = pd;

      const mapper = vtkMapper.newInstance();
      mapper.setInputData(pd);
      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.getProperty().setColor(0.0, 1.0, 1.0);
      actor.getProperty().setOpacity(0.7);

      rendererRef.current?.renderer.addActor(actor);
      rendererRef.current?.renderer.resetCamera();
      rendererRef.current?.renWin.render();
    }

    addMesh();
  }, [ready, mesh]);

  // ── Update implant points when transform changes ─────────────────────────
  useEffect(() => {
    if (!updatedWorldPoints || !implantDataRef.current || !rendererRef.current) return;

    const pts = new Float32Array(updatedWorldPoints.flat());
    implantDataRef.current.getPoints().setData(pts, 3);
    implantDataRef.current.modified();
    rendererRef.current.renWin.render();
  }, [updatedWorldPoints]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#1a1a1a", borderRadius: 4 }}>
      <div style={{ position: "absolute", top: 6, left: 8, fontSize: 12, color: "#aaa", zIndex: 1 }}>
        3D View — click to jump implant
      </div>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
