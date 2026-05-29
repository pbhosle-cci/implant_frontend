"use client";

import { uploadScan, uploadMesh, computeBvtv, exportMeshUrl, exportNiftiUrl } from "@/lib/api";
import { coolwarmCss } from "@/lib/colormap";
import type { ScanMeta, MeshData } from "@/types";

interface Props {
  scan: ScanMeta | null;
  slices: { x: number; y: number; z: number };
  bvtvScore: number | null;
  bvtvPerCell: number[] | null;
  loading: string | null;
  hasMesh: boolean;
  boneOpacity: number;
  implantOpacity: number;
  showBoneOverlay: boolean;
  onScanLoaded: (meta: ScanMeta) => void;
  onMeshLoaded: (mesh: MeshData) => void;
  onSliceChange: (axis: "x" | "y" | "z", val: number) => void;
  onBvtvComputed: (score: number, perCell: number[]) => void;
  onGotoCenter: () => void;
  onBoneOpacity: (v: number) => void;
  onImplantOpacity: (v: number) => void;
  onToggleBoneOverlay: () => void;
  setLoading: (msg: string | null) => void;
}

const btn: React.CSSProperties = {
  width: "100%", padding: "8px 12px", marginBottom: 8,
  background: "#007acc", color: "white", border: "none",
  borderRadius: 4, cursor: "pointer", fontSize: 13, textAlign: "left",
};
const btnDisabled: React.CSSProperties = { ...btn, background: "#444", cursor: "not-allowed" };
const btnGreen: React.CSSProperties    = { ...btn, background: "#2e7d32" };

export default function ControlPanel({
  scan, slices, bvtvScore, bvtvPerCell, loading, hasMesh,
  boneOpacity, implantOpacity, showBoneOverlay,
  onScanLoaded, onMeshLoaded, onSliceChange,
  onBvtvComputed, onGotoCenter,
  onBoneOpacity, onImplantOpacity, onToggleBoneOverlay,
  setLoading,
}: Props) {

  async function handleLoadScan() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".nii,.nii.gz";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setLoading("Loading NIfTI...");
      try { onScanLoaded(await (await import("@/lib/api")).uploadScan(file)); }
      catch (e) { alert("Failed to load scan: " + e); }
      finally { setLoading(null); }
    };
    input.click();
  }

  async function handleLoadMesh() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".vtk,.vtp,.ply,.stl,.obj";
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      setLoading("Loading mesh...");
      try { onMeshLoaded(await uploadMesh(file)); }
      catch (e) { alert("Failed to load mesh: " + e); }
      finally { setLoading(null); }
    };
    input.click();
  }

  async function handleComputeBvtv() {
    setLoading("Computing BV/TV...");
    try {
      const result = await computeBvtv();
      onBvtvComputed(result.mean_bvtv, result.per_cell);
    } catch (e) { alert("BV/TV failed: " + e); }
    finally { setLoading(null); }
  }

  const sliderStyle: React.CSSProperties = { width: "100%", accentColor: "#007acc", marginTop: 4 };
  const labelStyle: React.CSSProperties  = { fontSize: 12, color: "#ccc" };

  const axes: Array<{ axis: "x"|"y"|"z"; max: number; label: string }> = scan ? [
    { axis: "x", max: scan.dims[0] - 1, label: "X (Sagittal)" },
    { axis: "y", max: scan.dims[1] - 1, label: "Y (Coronal)"  },
    { axis: "z", max: scan.dims[2] - 1, label: "Z (Axial)"    },
  ] : [];

  const minBvtv = bvtvPerCell ? Math.min(...bvtvPerCell).toFixed(3) : null;
  const maxBvtv = bvtvPerCell ? Math.max(...bvtvPerCell).toFixed(3) : null;

  return (
    <div style={{ padding: 12 }}>

      <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16 }}>Implant Planning Software</div>

      {loading && (
        <div style={{ background: "#1a3a5c", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 12, color: "#7bc8ff" }}>
          {loading}
        </div>
      )}

      {/* Action buttons — names match desktop app exactly */}
      <button style={btn} onClick={handleLoadScan}>Load NIfTI File</button>
      <button style={scan ? btn : btnDisabled} onClick={handleLoadMesh} disabled={!scan}>Load Mesh</button>
      <button style={hasMesh ? btn : btnDisabled} onClick={onGotoCenter} disabled={!hasMesh}>Go to Mesh Center</button>
      <button style={hasMesh ? btnGreen : btnDisabled} onClick={handleComputeBvtv} disabled={!hasMesh}>Compute BV/TV</button>
      <button style={btn} onClick={() => window.open(exportMeshUrl(), "_blank")}>Export Mesh</button>
      <button style={btn} onClick={() => window.open(exportNiftiUrl(), "_blank")}>Export BV/TV as NIfTI</button>
      <button style={btnDisabled} disabled>Batch Process</button>

      {/* Keyboard hint */}
      {hasMesh && (
        <div style={{ background: "#1a2a1a", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 11, color: "#7bc87b" }}>
          Drag slices: left=move · right=rotate<br />
          A/D · Q/E · W/S to rotate · Shift=90°
        </div>
      )}

      {/* BV/TV result */}
      {bvtvScore !== null && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: coolwarmCss(bvtvScore), textAlign: "center" }}>
            BV/TV: {bvtvScore.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginBottom: 6 }}>
            {bvtvScore > 0.5 ? "Strong bone" : bvtvScore > 0.3 ? "Moderate bone" : "Weak bone"}
          </div>
          {minBvtv !== null && (
            <div style={{ fontSize: 11, color: "#666", textAlign: "center" }}>
              min {minBvtv} · max {maxBvtv}
            </div>
          )}
          {/* Color bar */}
          <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: "linear-gradient(to right, rgb(59,76,192), rgb(221,221,221), rgb(180,4,38)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555" }}>
            <span>0 weak</span><span>0.5</span><span>1 strong</span>
          </div>
        </div>
      )}

      {/* Opacity sliders */}
      <div style={{ borderTop: "1px solid #333", paddingTop: 12, marginBottom: 12 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Mesh Opacity: {Math.round(implantOpacity * 100)}%</div>
          <input type="range" min={0} max={100} value={Math.round(implantOpacity * 100)}
            style={sliderStyle}
            onChange={(e) => onImplantOpacity(Number(e.target.value) / 100)} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Segmentation Overlay Opacity: {Math.round(boneOpacity * 100)}%</div>
          <input type="range" min={0} max={100} value={Math.round(boneOpacity * 100)}
            style={sliderStyle}
            onChange={(e) => onBoneOpacity(Number(e.target.value) / 100)} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#ccc", cursor: "pointer" }}>
          <input type="checkbox" checked={showBoneOverlay} onChange={onToggleBoneOverlay} />
          Show Segmentation Overlay
        </label>
      </div>

      {/* Slice sliders */}
      {scan && (
        <div style={{ borderTop: "1px solid #333", paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Slice Position</div>
          {axes.map(({ axis, max, label }) => (
            <div key={axis} style={{ marginBottom: 12 }}>
              <div style={labelStyle}>{label}: {slices[axis]}</div>
              <input type="range" min={0} max={max} value={slices[axis]}
                style={sliderStyle}
                onChange={(e) => onSliceChange(axis, Number(e.target.value))} />
            </div>
          ))}
        </div>
      )}

      {/* Scan info */}
      {scan && (
        <div style={{ borderTop: "1px solid #333", paddingTop: 12, fontSize: 11, color: "#555" }}>
          <div>{scan.filename}</div>
          <div>Dims: {scan.dims.join(" × ")}</div>
          <div>Spacing: {scan.spacing.map(s => s.toFixed(2)).join(" × ")} mm</div>
        </div>
      )}

    </div>
  );
}
