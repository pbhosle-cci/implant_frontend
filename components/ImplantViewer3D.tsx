"use client";

import { useEffect, useRef } from "react";
import type { MeshData } from "@/types";

interface Props {
  mesh: MeshData | null;
  updatedWorldPoints?: number[][] | null;
  bvtvPerCell?: number[] | null;
}

export default function ImplantViewer3D({ mesh, updatedWorldPoints, bvtvPerCell }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const rendererRef     = useRef<any>(null);
  const implantDataRef  = useRef<any>(null);
  const implantMapRef   = useRef<any>(null);
  const implantActorRef = useRef<any>(null);
  const initializedRef  = useRef(false);

  // ── Init renderer ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      await import("@kitware/vtk.js/Rendering/Profiles/Geometry");
      const vtkFullScreenRenderWindow = (await import("@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow")).default;
      if (cancelled || !containerRef.current) return;

      const renderWindow = vtkFullScreenRenderWindow.newInstance({
        container: containerRef.current,
        background: [0.08, 0.08, 0.08],
      });

      rendererRef.current = {
        renderWindow,
        renderer: renderWindow.getRenderer(),
        renWin:   renderWindow.getRenderWindow(),
      };
    }

    init();
    return () => {
      cancelled = true;
      rendererRef.current?.renderWindow?.delete();
    };
  }, []);

  // ── Load implant mesh ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mesh || initializedRef.current || !rendererRef.current) return;

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
      implantMapRef.current = mapper;

      const actor = vtkActor.newInstance();
      actor.setMapper(mapper);
      actor.getProperty().setColor(0.0, 1.0, 1.0);
      actor.getProperty().setOpacity(0.9);
      implantActorRef.current = actor;

      const { renderer, renWin } = rendererRef.current;
      renderer.addActor(actor);
      renderer.resetCamera();
      renWin.render();

      initializedRef.current = true;
    }

    addMesh();
  }, [mesh, rendererRef.current]);

  // ── Update points on transform ────────────────────────────────────────────
  useEffect(() => {
    if (!updatedWorldPoints || !implantDataRef.current || !rendererRef.current) return;
    const pts = new Float32Array(updatedWorldPoints.flat());
    implantDataRef.current.getPoints().setData(pts, 3);
    implantDataRef.current.modified();
    rendererRef.current.renWin.render();
  }, [updatedWorldPoints]);

  // ── Apply BV/TV colormap ──────────────────────────────────────────────────
  useEffect(() => {
    if (!bvtvPerCell || !implantDataRef.current || !implantMapRef.current || !rendererRef.current) return;

    async function applyColormap() {
      const vtkDataArray             = (await import("@kitware/vtk.js/Common/Core/DataArray")).default;
      const vtkColorTransferFunction = (await import("@kitware/vtk.js/Rendering/Core/ColorTransferFunction")).default;

      const lut = vtkColorTransferFunction.newInstance();
      lut.addRGBPoint(0.0, 0.231, 0.298, 0.753);
      lut.addRGBPoint(0.5, 0.865, 0.865, 0.865);
      lut.addRGBPoint(1.0, 0.706, 0.015, 0.149);

      const scalars = vtkDataArray.newInstance({
        name: "bvtv",
        values: new Float32Array(bvtvPerCell!),
        numberOfComponents: 1,
      });
      implantDataRef.current.getCellData().setScalars(scalars);
      implantDataRef.current.modified();

      implantMapRef.current.setScalarModeToUseCellData();
      implantMapRef.current.setColorByArrayName("bvtv");
      implantMapRef.current.setScalarRange(0, 1);
      implantMapRef.current.setLookupTable(lut);
      implantMapRef.current.setScalarVisibility(true);
      implantActorRef.current?.getProperty().setColor(1, 1, 1);

      rendererRef.current.renWin.render();
    }

    applyColormap();
  }, [bvtvPerCell]);

  if (!mesh) return null;

  return (
    <div style={{ borderBottom: "1px solid #333", padding: 8 }}>
      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Implant View</div>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 180, background: "#141414", borderRadius: 4 }}
      />
    </div>
  );
}
