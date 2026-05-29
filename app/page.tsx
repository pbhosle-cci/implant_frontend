"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import SliceViewer from "@/components/SliceViewer";
import ControlPanel from "@/components/ControlPanel";
import { useTransform } from "@/hooks/useTransform";
import type { ScanMeta, MeshData } from "@/types";

const BoneViewer3D    = dynamic(() => import("@/components/BoneViewer3D"),    { ssr: false });
const ImplantViewer3D = dynamic(() => import("@/components/ImplantViewer3D"), { ssr: false });

export default function HomePage() {
  const [scan,            setScan]            = useState<ScanMeta | null>(null);
  const [mesh,            setMesh]            = useState<MeshData | null>(null);
  const [slices,          setSlices]          = useState({ x: 0, y: 0, z: 0 });
  const [bvtvScore,       setBvtvScore]       = useState<number | null>(null);
  const [bvtvPerCell,     setBvtvPerCell]     = useState<number[] | null>(null);
  const [loading,         setLoading]         = useState<string | null>(null);
  const [boneOpacity,     setBoneOpacity]     = useState(0.4);
  const [implantOpacity,  setImplantOpacity]  = useState(0.7);
  const [showBoneOverlay, setShowBoneOverlay] = useState(true);

  const {
    voxelPoints, worldPoints, centerVoxel,
    translate, rotate, jumpToVoxel, initFromMesh,
  } = useTransform(scan, !!mesh);

  const handleMeshLoaded = useCallback((m: MeshData) => {
    setMesh(m);
    initFromMesh(m.voxel_points, m.center_voxel);
    setBvtvPerCell(null);
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
                  showBoneOverlay={showBoneOverlay}
                  onTranslate={translate}
                  onRotate={rotate}
                />
              </div>
            ))}
            <div style={{ minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative" }}>
              <BoneViewer3D
                mesh={mesh}
                updatedWorldPoints={worldPoints}
                bvtvPerCell={bvtvPerCell}
                boneOpacity={boneOpacity}
                implantOpacity={implantOpacity}
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

      {/* RIGHT — implant viewer + controls */}
      <div style={{ flex: 1, minWidth: 240, borderLeft: "1px solid #333", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <ImplantViewer3D
          mesh={mesh}
          updatedWorldPoints={worldPoints}
          bvtvPerCell={bvtvPerCell}
        />
        <ControlPanel
          scan={scan}
          slices={slices}
          bvtvScore={bvtvScore}
          bvtvPerCell={bvtvPerCell}
          loading={loading}
          hasMesh={!!mesh}
          boneOpacity={boneOpacity}
          implantOpacity={implantOpacity}
          showBoneOverlay={showBoneOverlay}
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
          onBvtvComputed={(score, perCell) => { setBvtvScore(score); setBvtvPerCell(perCell); }}
          onGotoCenter={handleGotoCenter}
          onBoneOpacity={setBoneOpacity}
          onImplantOpacity={setImplantOpacity}
          onToggleBoneOverlay={() => setShowBoneOverlay(v => !v)}
          setLoading={setLoading}
        />
      </div>

    </div>
  );
}
