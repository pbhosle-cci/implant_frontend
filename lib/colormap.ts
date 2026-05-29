// Coolwarm colormap: blue (0) → white (0.5) → red (1)
export function coolwarm(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  if (c < 0.5) {
    const s = c * 2;
    return [
      Math.round(59  + s * (255 - 59)),
      Math.round(76  + s * (255 - 76)),
      Math.round(192 + s * (255 - 192)),
    ];
  } else {
    const s = (c - 0.5) * 2;
    return [
      255,
      Math.round(255 - s * (255 - 38)),
      Math.round(255 - s * (255 - 38)),
    ];
  }
}

// Returns a CSS color string
export function coolwarmCss(t: number): string {
  const [r, g, b] = coolwarm(t);
  return `rgb(${r},${g},${b})`;
}
