export function identity3(): number[][] {
  return [[1,0,0],[0,1,0],[0,0,1]];
}

export function rotationMatrix(axis: "x"|"y"|"z", angleDeg: number): number[][] {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  if (axis === "x") return [[1,0,0],[0,c,-s],[0,s,c]];
  if (axis === "y") return [[c,0,s],[0,1,0],[-s,0,c]];
  return [[c,-s,0],[s,c,0],[0,0,1]];
}

export function matMul(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) =>
    B[0].map((_, j) =>
      row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0)
    )
  );
}
