export interface ScanMeta {
  dims: [number, number, number];
  spacing: [number, number, number];
  threshold: number;
  filename: string;
}

export interface MeshData {
  points: number[][];
  faces: number[];
  n_points: number;
  n_cells: number;
  filename: string;
  voxel_points: number[][];
  center_voxel: number[];
}

export interface TransformResult {
  points: number[][];
  faces: number[];
  voxel_points: number[][];
  center_voxel: number[];
}

export interface SliceResponse {
  plane: string;
  index: number;
  width: number;
  height: number;
  data: number[];
}
