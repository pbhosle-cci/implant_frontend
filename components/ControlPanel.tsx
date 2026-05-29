"use client";

import { uploadScan, uploadMesh, computeBvtv, exportMeshUrl, exportNiftiUrl } from "@/lib/api";
import type { ScanMeta, MeshData } from "@/types";

interface Props {
  scan: ScanMeta | null;
  slices: { x: number; y: number; z: number };
  bvtvScore: number | null;
  loading: string | null;
  hasMesh: boolean;
  onScanLoaded: (meta: ScanMeta) => void;
  onMeshLoaded: (mesh: MeshData) => void;
  onSliceChange: (axis: "x" | "y" | "z", val: number) => void;
  onBvtvComputed: (score: number) => void;
  onGotoCenter: () => void;
  setLoading: (msg: string | null) => void;
}

const btn: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  marginBottom: 8,
  background: "#007acc",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
  textAlign: "left",
};

const btnDisabled: React.CSSProperties = { ...btn, background: "#444", cursor: "not-allowed" };

export default function ControlPanel({
  scan, slices, bvtvScore, loading, hasMesh,
  onScanLoaded, onMeshLoaded, onSliceChange, onBvtvComputed, onGotoCenter, setLoading,
}: Props) {

  async function handleLoadScan() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".nii,.nii.gz";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setLoading("Loading CT scan...");
      try {
        const meta = await uploadScan(file);
        onScanLoaded(meta);
      } catch (e) {
        alert("Failed to load scan: " + e);
      } finally {
        setLoading(null);
      }
    };
    input.click();
  }

  async function handleLoadMesh() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".vtk,.vtp,.ply,.stl,.obj";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setLoading("Loading mesh...");
      try {
        const mesh = await uploadMesh(file);
        onMeshLoaded(mesh);
      } catch (e) {
        alert("Failed to load mesh: " + e);
      } finally {
        setLoading(null);
      }
    };
    input.click();
  }

  async function handleComputeBvtv() {
    setLoading("Computing BV/TV...");
    try {
      const result = await computeBvtv();
      onBvtvComputed(result.mean_bvtv);
    } catch (e) {
      alert("BV/TV failed: " + e);
    } finally {
      setLoading(null);
    }
  }

  function handleExportMesh() {
    window.open(exportMeshUrl(), "_blank");
  }

  function handleExportNifti() {
    window.open(exportNiftiUrl(), "_blank");
  }

  const sliderStyle: React.CSSProperties = { width: "100%", accentColor: "#007acc", marginTop: 4 };
  const axes: Array<{ axis: "x" | "y" | "z"; max: number; label: string }> = scan
    ? [
        { axis: "x", max: scan.dims[0] - 1, label: "X (Sagittal)" },
        { axis: "y", max: scan.dims[1] - 1, label: "Y (Coronal)" },
        { axis: "z", max: scan.dims[2] - 1, label: "Z (Axial)" },
      ]
    : [];

  return (
    <div style={{ padding: 12 }}>

      {/* Title */}
      <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 16, color: "#fff" }}>IMPLANZ</div>

      {/* Loading indicator */}
      {loading && (
        <div style={{ background: "#1a3a5c", padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 12, color: "#7bc8ff" }}>
          {loading}
        </div>
      )}

      {/* Buttons */}
      <button style={btn} onClick={handleLoadScan}>Load CT Scan</button>
      <button style={scan ? btn : btnDisabled} onClick={handleLoadMesh} disabled={!scan}>Load Implant Mesh</button>
      <button style={hasMesh ? btn : btnDisabled} onClick={onGotoCenter} disabled={!hasMesh}>Go to Mesh Center</button>
      <button style={scan ? btn : btnDisabled} onClick={handleComputeBvtv} disabled={!scan}>Compute BV/TV</button>
      <button style={btn} onClick={handleExportMesh}>Export Mesh</button>
      <button style={btn} onClick={handleExportNifti}>Export BV/TV NIfTI</button>

      {hasMesh && (
        <div style={{ background: "#1a2a1a", padding: 8, borderRadius: 4, marginBottom: 8, fontSize: 11, color: "#7bc87b" }}>
          Drag slices to move implant<br/>
          Right-drag to rotate<br/>
          A/D Q/E W/S keys to rotate<br/>
          Shift + key for 90°
        </div>
      )}

      {/* BV/TV Score */}
      {bvtvScore !== null && (
        <div style={{ background: "#1a1a1a", padding: 10, borderRadius: 4, marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#aaa" }}>BV/TV Score</div>
          <div style={{ fontSize: 24, fontWeight: "bold", color: bvtvScore > 0.5 ? "#4caf50" : bvtvScore > 0.3 ? "#ff9800" : "#f44336" }}>
            {bvtvScore.toFixed(3)}
          </div>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {bvtvScore > 0.5 ? "Strong bone" : bvtvScore > 0.3 ? "Moderate bone" : "Weak bone"}
          </div>
        </div>
      )}

      {/* Slice sliders */}
      {scan && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Slice Position</div>
          {axes.map(({ axis, max, label }) => (
            <div key={axis} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#ccc" }}>{label}: {slices[axis]}</div>
              <input
                type="range"
                min={0}
                max={max}
                value={slices[axis]}
                style={sliderStyle}
                onChange={(e) => onSliceChange(axis, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      )}

      {/* Scan info */}
      {scan && (
        <div style={{ marginTop: 16, fontSize: 11, color: "#555", borderTop: "1px solid #333", paddingTop: 12 }}>
          <div>{scan.filename}</div>
          <div>Dims: {scan.dims.join(" × ")}</div>
          <div>Spacing: {scan.spacing.map(s => s.toFixed(2)).join(" × ")} mm</div>
          <div>Threshold: {scan.threshold.toFixed(0)}</div>
        </div>
      )}

    </div>
  );
}
