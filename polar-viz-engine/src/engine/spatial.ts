import type { Dataset, Variable, VarRole } from '../types/dataset';

export const KM_PER_DEG = 111.32;

export interface Points { x: Float32Array; y: Float32Array; z: Float32Array } // km; z = depth in km (down +)

export function getVar(ds: Dataset, role: VarRole): Variable | undefined {
  return ds.variables.find(v => v.role === role && (v.values || v.labels));
}

/** True if the dataset has any usable vertical coordinate: depth, pressure or elevation. */
export function hasVertical(ds: Dataset): boolean {
  return !!(getVar(ds, 'depth') || getVar(ds, 'pressure') || getVar(ds, 'elevation'));
}

/** Depth in metres, positive down. Pressure (dbar) is used as ~1 m/dbar; elevation (positive up) is negated. */
export function depthMetres(ds: Dataset): Float64Array | undefined {
  const v = getVar(ds, 'depth') ?? getVar(ds, 'pressure');
  if (v?.values) {
    const arr = Float64Array.from(v.values);
    const sorted = Array.from(arr).filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length && sorted[Math.floor(sorted.length / 2)] < 0) for (let i = 0; i < arr.length; i++) arr[i] = -arr[i];
    return arr;
  }
  const e = getVar(ds, 'elevation');
  return e?.values ? Float64Array.from(e.values, x => -x) : undefined;
}

const ID_LIKE = /^(id|index|idx|row|rownum|no|sr|srno|n|count|flag|qc\w*)$|(^|[_ ])(flag|qc|id)([_ ]|$)/i;
const PREFERRED = /temp|sal|oxy|chl|fluor|dens|turb|nitrat|phosph|silic|ice|conc|speed|anomal|ph\b/i;

/** Numeric measurement columns worth colouring by: not coordinates/IDs/flags, not constant. Best candidates first. */
export function pickScalars(ds: Dataset): Variable[] {
  const usable = (v: Variable) => v.role === 'scalar' && !ID_LIKE.test(v.name.trim()) &&
    (v.values ? v.min !== undefined && v.max !== undefined && v.max > v.min : ds.layout === 'gridded' && v.dims.length >= 2);
  const score = (v: Variable) => Number(PREFERRED.test(`${v.name} ${v.longName ?? ''}`));
  return ds.variables.filter(usable).sort((a, b) => score(b) - score(a));
}

/** Latitude/longitude (and optionally one scalar) for 2D maps. Longitudes are unwrapped across the antimeridian. */
export function extractLatLon(ds: Dataset, scalarName?: string) {
  const lat = getVar(ds, 'latitude')?.values, lon = getVar(ds, 'longitude')?.values;
  if (!lat || !lon) return undefined;
  const val = scalarName ? ds.variables.find(v => v.name === scalarName)?.values : undefined;
  const keep: number[] = [];
  for (let i = 0; i < lat.length; i++) if (Number.isFinite(lat[i]) && Number.isFinite(lon[i]) && Math.abs(lat[i]) <= 90) keep.push(i);
  if (!keep.length) return undefined;
  const lon0 = lon[keep[0]];
  return {
    lat: Float32Array.from(keep, i => lat[i]),
    lon: Float32Array.from(keep, i => (((lon[i] - lon0 + 540) % 360) - 180) + lon0),
    values: val ? Float32Array.from(keep, i => (Number.isFinite(val[i]) ? val[i] : NaN)) : undefined,
  };
}

/** One integer id per row identifying the cast/station. Uses station labels, else 0.01° lat/lon cells. */
export function castIds(ds: Dataset): Int32Array {
  const n = ds.rowCount, ids = new Int32Array(n), seen = new Map<string, number>();
  const st = getVar(ds, 'station'), lat = getVar(ds, 'latitude')?.values, lon = getVar(ds, 'longitude')?.values;
  for (let i = 0; i < n; i++) {
    const key = st?.labels ? st.labels[i] : st?.values ? String(st.values[i])
      : lat && lon ? `${Math.round(lat[i] * 100)}|${Math.round(lon[i] * 100)}` : '0';
    if (!seen.has(key)) seen.set(key, seen.size);
    ids[i] = seen.get(key)!;
  }
  return ids;
}

/** Local equirectangular projection (km). Handles the antimeridian by unwrapping around the first longitude. */
export function toLocalXYZ(lat: ArrayLike<number>, lon: ArrayLike<number>, depthM: ArrayLike<number>) {
  const keep: number[] = [];
  for (let i = 0; i < lat.length; i++)
    if (Number.isFinite(lat[i]) && Number.isFinite(lon[i]) && Number.isFinite(depthM[i])) keep.push(i);
  const lat0 = keep.length ? lat[keep[0]] : 0, lon0 = keep.length ? lon[keep[0]] : 0;
  const kmLon = KM_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  const n = keep.length, x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
  keep.forEach((src, k) => {
    x[k] = (((lon[src] - lon0 + 540) % 360) - 180) * kmLon;
    y[k] = (lat[src] - lat0) * KM_PER_DEG;
    z[k] = depthM[src] / 1000;
  });
  return { points: { x, y, z } as Points, rows: Int32Array.from(keep) };
}

/** Pull aligned (points, values) for one scalar variable from a tabular dataset. */
export function extractPoints(ds: Dataset, scalarName: string) {
  const lat = getVar(ds, 'latitude')?.values, lon = getVar(ds, 'longitude')?.values;
  const depth = depthMetres(ds), val = ds.variables.find(v => v.name === scalarName)?.values;
  if (!lat || !lon || !depth || !val) return undefined;
  const { points, rows } = toLocalXYZ(lat, lon, depth);
  const keep: number[] = [];
  rows.forEach((r, k) => { if (Number.isFinite(val[r])) keep.push(k); });
  const pick = (a: Float32Array) => Float32Array.from(keep, k => a[k]);
  return {
    points: { x: pick(points.x), y: pick(points.y), z: pick(points.z) } as Points,
    values: Float32Array.from(keep, k => val[rows[k]]),
  };
}

// ---------- spatial hash (distances measured with z scaled by zScale) ----------

const BASE = 131072;
export class SpatialHash {
  private cells = new Map<number, number[]>();
  private cell: number;
  private p: Points;
  private zs: number;
  constructor(p: Points, cell: number, zScale: number) {
    this.p = p; this.cell = cell; this.zs = zScale;
    for (let i = 0; i < p.x.length; i++) {
      const k = this.key(Math.floor(p.x[i] / cell), Math.floor(p.y[i] / cell), Math.floor((p.z[i] * zScale) / cell));
      const a = this.cells.get(k);
      a ? a.push(i) : this.cells.set(k, [i]);
    }
  }
  private key(ix: number, iy: number, iz: number) {
    return ((ix + 65536) * BASE + (iy + 65536)) * BASE + (iz + 65536);
  }
  /** Calls fn(index, distance) for every point within r. fn may return true to stop early. */
  within(x: number, y: number, z: number, r: number, fn: (i: number, d: number) => boolean | void) {
    const c = this.cell, zz = z * this.zs, rc = Math.ceil(r / c);
    const cx = Math.floor(x / c), cy = Math.floor(y / c), cz = Math.floor(zz / c);
    for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) for (let d = -rc; d <= rc; d++) {
      const list = this.cells.get(this.key(cx + a, cy + b, cz + d));
      if (!list) continue;
      for (const i of list) {
        const dx = this.p.x[i] - x, dy = this.p.y[i] - y, dz = (this.p.z[i] - z) * this.zs;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= r && fn(i, dist) === true) return;
      }
    }
  }
}

export function bounds(p: Points) {
  const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (let i = 0; i < p.x.length; i++) {
    const v = [p.x[i], p.y[i], p.z[i]];
    for (let k = 0; k < 3; k++) { b.min[k] = Math.min(b.min[k], v[k]); b.max[k] = Math.max(b.max[k], v[k]); }
  }
  return b;
}

function mulberry32(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Fraction of the data's bounding volume that lies within `radius` of a real observation (Monte Carlo). */
export function coverageFraction(p: Points, radius: number, zScale: number, samples = 3000): number {
  if (p.x.length === 0) return 0;
  const b = bounds(p), hash = new SpatialHash(p, radius, zScale), rnd = mulberry32(42);
  let hit = 0;
  for (let s = 0; s < samples; s++) {
    const x = b.min[0] + rnd() * (b.max[0] - b.min[0]);
    const y = b.min[1] + rnd() * (b.max[1] - b.min[1]);
    const z = b.min[2] + rnd() * (b.max[2] - b.min[2]);
    let found = false;
    hash.within(x, y, z, radius, () => { found = true; return true; });
    if (found) hit++;
  }
  return hit / samples;
}

/** Interpolated field on a regular grid. Nodes farther than `radius` from every observation stay NaN (never filled). */
export function boundedIDW(
  p: Points, v: Float32Array, radius: number, zScale: number,
  n: [number, number, number], power = 2,
) {
  const b = bounds(p), hash = new SpatialHash(p, radius, zScale);
  const grid = new Float32Array(n[0] * n[1] * n[2]).fill(NaN);
  const step = (k: number) => (n[k] > 1 ? (b.max[k] - b.min[k]) / (n[k] - 1) : 0);
  const sx = step(0), sy = step(1), sz = step(2);
  for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
    const x = b.min[0] + i * sx, y = b.min[1] + j * sy, z = b.min[2] + k * sz;
    let wSum = 0, vSum = 0, exact = NaN;
    hash.within(x, y, z, radius, (idx, d) => {
      if (d < 1e-6) { exact = v[idx]; return true; }
      const w = 1 / Math.pow(d, power);
      wSum += w; vSum += w * v[idx];
    });
    grid[(i * n[1] + j) * n[2] + k] = Number.isFinite(exact) ? exact : wSum > 0 ? vSum / wSum : NaN;
  }
  return { grid, min: b.min, max: b.max, size: n };
}

/** Thin points to <= max (landing close to max) by keeping one per voxel: preserves extent and rare extremes. */
export function adaptiveSample(p: Points, max: number): Int32Array {
  const n = p.x.length;
  if (n <= max) return Int32Array.from({ length: n }, (_, i) => i);
  const b = bounds(p);
  const diag = Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], (b.max[2] - b.min[2]) * 100);
  if (!(diag > 0)) return Int32Array.from({ length: max }, (_, i) => i);
  const thin = (cell: number) => {
    const seen = new Set<number>(), keep: number[] = [];
    for (let i = 0; i < n; i++) {
      const k = ((Math.floor(p.x[i] / cell) + 65536) * BASE + (Math.floor(p.y[i] / cell) + 65536)) * BASE
        + Math.floor((p.z[i] * 100) / cell) + 65536;
      if (!seen.has(k)) { seen.add(k); keep.push(i); }
    }
    return keep;
  };
  // larger cell => fewer points. Bisect (log scale) for the smallest cell that fits under max.
  let lo = diag / 1e4, hi = diag, best: number[] | null = null;
  for (let iter = 0; iter < 9; iter++) {
    const mid = Math.sqrt(lo * hi), keep = thin(mid);
    if (keep.length <= max) { best = keep; hi = mid; } else lo = mid;
  }
  if (!best) best = thin(hi);
  return Int32Array.from(best);
}
