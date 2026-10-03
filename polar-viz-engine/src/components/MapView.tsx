import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '../types/dataset';
import { adaptiveSample, extractLatLon } from '../engine/spatial';
import { DEFAULT_CONFIG } from '../engine/capabilityEngine';
import { colormap, cssColor } from '../engine/colormap';

interface Props {
  dataset: Dataset;
  /** Optional numeric column to colour by. Without it, positions are drawn as plain points. */
  variable?: string;
  height?: number;
}

type Proj = 'polar' | 'plate';
const R = 6371, LEVELS = 24, RAD = Math.PI / 180;
const wrapLon = (x: number) => (((x + 540) % 360) - 180);
const fmt = (n: number) => Number(n.toPrecision(5));

export default function MapView({ dataset, variable, height = 520 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef({ k: 1, ox: 0, oy: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<Proj | null>(null);
  const [tip, setTip] = useState('');

  // 1. extract + thin
  const data = useMemo(() => {
    const d = extractLatLon(dataset, variable || undefined);
    if (!d) return undefined;
    const n = d.lat.length;
    const keep = adaptiveSample({ x: d.lon, y: d.lat, z: new Float32Array(n) }, DEFAULT_CONFIG.maxPointsGPU);
    const pick = (a: Float32Array) => Float32Array.from(keep, i => a[i]);
    const lat = pick(d.lat), lon = pick(d.lon), values = d.values ? pick(d.values) : undefined;
    const sortedLat = Array.from(lat).sort((a, b) => a - b), medLat = sortedLat[Math.floor(sortedLat.length / 2)];
    let vmin = Infinity, vmax = -Infinity;
    if (values) for (const v of values) if (Number.isFinite(v)) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
    return { lat, lon, values, medLat, vmin, vmax, total: n, thinned: keep.length < n };
  }, [dataset, variable]);

  const proj: Proj = mode ?? (data && Math.abs(data.medLat) > 60 ? 'polar' : 'plate');

  // 2. project to km + colour bins (recomputed only when data or projection changes)
  const geom = useMemo(() => {
    if (!data) return undefined;
    const n = data.lat.length, X = new Float64Array(n), Y = new Float64Array(n), s = data.medLat < 0 ? -1 : 1;
    const kx = Math.cos(data.medLat * RAD);
    for (let i = 0; i < n; i++) {
      if (proj === 'polar') {
        const r = 2 * R * Math.tan(Math.PI / 4 - (s * data.lat[i] * RAD) / 2), lam = data.lon[i] * RAD;
        X[i] = -s * r * Math.sin(lam); Y[i] = r * Math.cos(lam); // Greenwich at the top
      } else { X[i] = data.lon[i] * RAD * R * kx; Y[i] = data.lat[i] * RAD * R; }
    }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); y0 = Math.min(y0, Y[i]); y1 = Math.max(y1, Y[i]); }
    const lists: number[][] = Array.from({ length: data.values ? LEVELS : 1 }, () => []);
    for (let i = 0; i < n; i++) {
      if (!data.values) { lists[0].push(i); continue; }
      const v = data.values[i];
      lists[Number.isFinite(v) ? Math.min(LEVELS - 1, Math.floor(((v - data.vmin) / (data.vmax - data.vmin || 1)) * LEVELS)) : 0].push(i);
    }
    return { X, Y, x0, x1, y0, y1, lists };
  }, [data, proj]);

  const draw = () => {
    const c = canvas.current;
    if (!c || !geom || !data) return;
    const ctx = c.getContext('2d')!, dpr = devicePixelRatio || 1, { k, ox, oy } = view.current;
    const w = c.width / dpr, h = c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b1622'; ctx.fillRect(0, 0, w, h);
    geom.lists.forEach((idx, lvl) => {
      ctx.fillStyle = data.values ? cssColor((lvl + 0.5) / LEVELS) : '#5ec8ff';
      for (const i of idx) {
        const sx = ox + geom.X[i] * k, sy = oy - geom.Y[i] * k;
        if (sx > -4 && sx < w + 4 && sy > -4 && sy < h + 4) ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
    });
  };

  const fit = () => {
    const c = canvas.current;
    if (!c || !geom) return;
    const w = c.clientWidth, h = c.clientHeight, pad = 40;
    const bw = Math.max(geom.x1 - geom.x0, 1e-6), bh = Math.max(geom.y1 - geom.y0, 1e-6);
    const k = Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh);
    view.current = { k, ox: w / 2 - ((geom.x0 + geom.x1) / 2) * k, oy: h / 2 + ((geom.y0 + geom.y1) / 2) * k };
    draw();
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => { const dpr = devicePixelRatio || 1; c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; draw(); };
    const ro = new ResizeObserver(resize); ro.observe(c);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015), v = view.current;
      view.current = { k: v.k * f, ox: mx - (mx - v.ox) * f, oy: my - (my - v.oy) * f }; draw();
    };
    c.addEventListener('wheel', wheel, { passive: false });
    resize(); fit();
    return () => { ro.disconnect(); c.removeEventListener('wheel', wheel); };
  }, [geom]);

  const onMove = (e: any) => {
    const c = canvas.current;
    if (!c || !geom || !data) return;
    const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (drag.current) {
      view.current.ox += e.clientX - drag.current.x; view.current.oy += e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY }; draw(); return;
    }
    const { k, ox, oy } = view.current;
    let best = -1, bd = 100; // 10 px radius, squared
    for (let i = 0; i < geom.X.length; i++) {
      const dx = ox + geom.X[i] * k - mx, dy = oy - geom.Y[i] * k - my, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    setTip(best < 0 ? '' : `${fmt(data.lat[best])}°, ${fmt(wrapLon(data.lon[best]))}°` +
      (data.values && Number.isFinite(data.values[best]) ? ` · ${variable}: ${fmt(data.values[best])}` : ''));
  };

  if (!data || !geom) return <p role="alert">This dataset has no usable latitude/longitude values to map.</p>;
  const unit = dataset.variables.find(v => v.name === variable)?.unit;
  const latMin = Math.min(...data.lat), latMax = Math.max(...data.lat);

  return (
    <div style={{ position: 'relative', height, borderRadius: 8, overflow: 'hidden', background: '#0b1622' }}>
      <canvas ref={canvas} style={{ width: '100%', height: '100%', cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(e: any) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerUp={() => (drag.current = null)} onPointerMove={onMove} onPointerLeave={() => setTip('')} onDoubleClick={fit} />
      <div style={{ position: 'absolute', top: 8, left: 8, color: '#e8f0f7', font: '13px system-ui' }}>
        <button onClick={fit}>Reset view</button>{' '}
        <button onClick={() => setMode(proj === 'polar' ? 'plate' : 'polar')}>
          Projection: {proj === 'polar' ? 'polar stereographic' : 'flat lat/lon'}
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 8, color: '#e8f0f7', font: '12px system-ui', pointerEvents: 'none', maxWidth: 380 }}>
        {data.values && <>
          <div style={{ height: 10, width: 200, background: `linear-gradient(90deg,${[0, .25, .5, .75, 1].map(t => `rgb(${colormap(t).map(c => Math.round(c * 255)).join(',')})`).join(',')})` }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
            <span>{fmt(data.vmin)}</span><span>{variable}{unit ? ` (${unit})` : ''}</span><span>{fmt(data.vmax)}</span>
          </div>
        </>}
        <div>{data.lat.length.toLocaleString()} positions · latitude {fmt(latMin)}° to {fmt(latMax)}° · drag to pan, scroll to zoom</div>
        {data.thinned && <div>Showing a thinned sample of {data.total.toLocaleString()} points.</div>}
      </div>
      {tip && <div style={{ position: 'absolute', top: 8, right: 8, background: '#000a', color: '#fff', padding: '4px 8px', borderRadius: 4, font: '12px system-ui' }}>{tip}</div>}
    </div>
  );
}
