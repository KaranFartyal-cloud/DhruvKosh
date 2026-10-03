const STOPS = [[0.267, 0.005, 0.329], [0.23, 0.322, 0.546], [0.128, 0.567, 0.551], [0.369, 0.789, 0.383], [0.993, 0.906, 0.144]];

/** t in 0..1 -> [r,g,b] in 0..1 (viridis-like) */
export function colormap(t: number): [number, number, number] {
  const s = Math.min(Math.max(t, 0), 1) * (STOPS.length - 1), i = Math.min(Math.floor(s), STOPS.length - 2), f = s - i;
  return [0, 1, 2].map(k => STOPS[i][k] + (STOPS[i + 1][k] - STOPS[i][k]) * f) as [number, number, number];
}
export const cssColor = (t: number) => `rgb(${colormap(t).map(c => Math.round(c * 255)).join(',')})`;
