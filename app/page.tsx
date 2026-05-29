"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import SliceViewer from "@/components/SliceViewer";
import ControlPanel from "@/components/ControlPanel";
import { useTransform } from "@/hooks/useTransform";
import type { ScanMeta, MeshData } from "@/types";

const BoneViewer3D = dynamic(() => import("@/components/BoneViewer3D"), { ssr: false });

export default function HomePage() {
  const [scan,      setScan]      = useState<ScanMeta | null>(null);
  const [mesh,      setMesh]      = useState<MeshData | null>(null);
  const [slices,    setSlices]    = useState({ x: 0, y: 0, z: 0 });
  const [bvtvScore, setBvtvScore] = useState<number | null>(null);
  const [loading,   setLoading]   = useState<string | null>(null);

  const {
    voxelPoints, worldPoints, centerVoxel,
    translate, rotate, jumpToVoxel, initFromMesh,
  } = useTransform(scan, !!mesh);

  const handleMeshLoaded = useCallback((m: MeshData) => {
    setMesh(m);
    initFromMesh(m.voxel_points, m.center_voxel);
  }, [initFromMesh]);

  const handleGotoCenter = useCallback(() => {
    if (!centerVoxel) return;
    setSlices({
      x: Math.round(centerVoxel[0]),
      y: Math.round(centerVoxel[1]),
      z: Math.round(centerVoxel[2]),
    });
  }, [centerVoxel]);

  const handleSceneClick = useCallback((worldPos: [number, number, number]) => {
    jumpToVoxel(worldPos);
  }, [jumpToVoxel]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", color: "white", fontFamily: "sans-serif" }}>

      {/* LEFT — 2x2 viewer grid */}
      <div style={{
        flex: 4,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 4,
        padding: 4,
        minWidth: 0,
        minHeight: 0,
      }}>
        {scan ? (
          <>
            {(["axial", "coronal", "sagittal"] as const).map((plane) => (
              <div key={plane} style={{ minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative" }}>
                <SliceViewer
                  plane={plane}
                  index={plane === "axial" ? slices.z : plane === "coronal" ? slices.y : slices.x}
                  scan={scan}
                  label={plane.charAt(0).toUpperCase() + plane.slice(1)}
                  meshVoxelPoints={voxelPoints}
                  onTranslate={translate}
                  onRotate={rotate}
                />
              </div>
            ))}
            <div style={{ minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative" }}>
              <BoneViewer3D
                mesh={mesh}
                updatedWorldPoints={worldPoints}
                onSceneClick={handleSceneClick}
              />
            </div>
          </>
        ) : (
          <div style={{ gridColumn: "1/-1", gridRow: "1/-1", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 18 }}>
            Load a CT scan to begin
          </div>
        )}
      </div>

      {/* RIGHT — controls */}
      <div style={{ flex: 1, minWidth: 240, borderLeft: "1px solid #333", overflowY: "auto" }}>
        <ControlPanel
          scan={scan}
          slices={slices}
          bvtvScore={bvtvScore}
          loading={loading}
          hasMesh={!!mesh}
          onScanLoaded={(meta) => {
            setScan(meta);
            setSlices({
              x: Math.floor(meta.dims[0] / 2),
              y: Math.floor(meta.dims[1] / 2),
              z: Math.floor(meta.dims[2] / 2),
            });
          }}
          onMeshLoaded={handleMeshLoaded}
          onSliceChange={(axis, val) => setSlices(prev => ({ ...prev, [axis]: val }))}
          onBvtvComputed={setBvtvScore}
          onGotoCenter={handleGotoCenter}
          setLoading={setLoading}
        />
      </div>

    </div>
  );
}
