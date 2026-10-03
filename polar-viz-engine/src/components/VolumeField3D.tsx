import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Dataset } from '../types/dataset';
import { adaptiveSample, boundedIDW, bounds, extractPoints } from '../engine/spatial';
import { DEFAULT_CONFIG } from '../engine/capabilityEngine';
import { colormap, cssColor as css } from '../engine/colormap';

interface Props {
  dataset: Dataset;            // tabular CTD-style data (lat, lon, depth/pressure, scalar)
  variable: string;            // scalar to colour by, e.g. "t090C"
  radiusKm?: number;           // max distance an interpolated cell may be from a real measurement
  gridSize?: [number, number, number];
  height?: number;
}


export default function VolumeField3D({ dataset, variable, radiusKm, gridSize = [36, 36, 24], height = 560 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<THREE.Group | null>(null);
  const resetView = useRef<() => void>(() => {});
  const unit = dataset.variables.find(v => v.name === variable)?.unit;

  // 1. data -> thinned observations -> bounded interpolation (no GPU/DOM work here)
  const field = useMemo(() => {
    if (dataset.layout !== 'tabular') return { error: 'This prototype renders tabular (CTD-style) data. Gridded files need a slice first.' };
    const raw = extractPoints(dataset, variable);
    if (!raw) return { error: `Needs latitude, longitude, depth/pressure and "${variable}".` };
    const keep = adaptiveSample(raw.points, DEFAULT_CONFIG.maxPointsGPU);
    const pick = (a: Float32Array) => Float32Array.from(keep, i => a[i]);
    const points = { x: pick(raw.points.x), y: pick(raw.points.y), z: pick(raw.points.z) }, values = pick(raw.values);
    const radius = radiusKm ?? DEFAULT_CONFIG.defaultRadiusKm;
    const g = boundedIDW(points, values, radius, DEFAULT_CONFIG.zScale, gridSize);
    let vmin = Infinity, vmax = -Infinity;
    for (const v of values) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
    const b = bounds(points);
    const horiz = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], 1), vert = Math.max(b.max[2] - b.min[2], 1e-3);
    return { points, values, g, radius, vmin, vmax, horiz, vert, thinned: keep.length < raw.values.length, total: raw.values.length };
  }, [dataset, variable, radiusKm, gridSize.join()]);

  const auto = 'error' in field ? 1 : Math.min(Math.max((0.3 * field.horiz) / field.vert, 1), 200);
  const [exag, setExag] = useState(auto);
  useEffect(() => setExag(auto), [auto]);

  // 2. build the three.js scene once per dataset
  useEffect(() => {
    if ('error' in field || !host.current) return;
    const el = host.current, { points, g, values, vmin, vmax, horiz, vert } = field;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1622);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, horiz * 100);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;

    // world: X = east, Y = up (so depth is -Y), Z = -north. Centre on the data.
    const c = [0, 1, 2].map(k => (g.min[k] + g.max[k]) / 2);
    const world = (x: number, y: number, z: number) => [x - c[0], -(z - c[2]), -(y - c[1])];
    const group = new THREE.Group(); root.current = group; scene.add(group);

    // measured observations: white points at exact coordinates
    const pos = new Float32Array(points.x.length * 3);
    for (let i = 0; i < points.x.length; i++) pos.set(world(points.x[i], points.y[i], points.z[i]), i * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const obs = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false }));
    obs.renderOrder = 2; group.add(obs);

    // interpolated cells: coloured boxes, only where a measurement is within radius
    const [nx, ny, nz] = g.size, cell = [0, 1, 2].map((k, i) => (g.size[i] > 1 ? (g.max[k] - g.min[k]) / (g.size[i] - 1) : 1));
    let count = 0; for (const v of g.grid) if (Number.isFinite(v)) count++;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.32, depthWrite: false }), Math.max(count, 1));
    const m4 = new THREE.Matrix4(), col = new THREE.Color(); let n = 0;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      const v = g.grid[(i * ny + j) * nz + k]; if (!Number.isFinite(v)) continue;
      const [wx, wy, wz] = world(g.min[0] + i * cell[0], g.min[1] + j * cell[1], g.min[2] + k * cell[2]);
      m4.compose(new THREE.Vector3(wx, wy, wz), new THREE.Quaternion(), new THREE.Vector3(cell[0], cell[2], cell[1]));
      mesh.setMatrixAt(n, m4); mesh.setColorAt(n, col.setRGB(...colormap((v - vmin) / (vmax - vmin || 1)))); n++;
    }
    mesh.count = n; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.renderOrder = 1; group.add(mesh);

    const frame = () => { camera.position.set(horiz * 0.9, horiz * 0.5, horiz * 1.1); controls.target.set(0, 0, 0); controls.update(); };
    resetView.current = frame; frame();

    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); }; loop();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      pg.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); (obs.material as THREE.Material).dispose();
      renderer.dispose(); renderer.domElement.remove(); root.current = null;
    };
  }, [field]);

  // 3. vertical exaggeration only scales the display; stored coordinates are never modified
  useEffect(() => { root.current?.scale.set(1, exag, 1); }, [exag, field]);

  if ('error' in field) return <p role="alert">{field.error}</p>;

  return (
    <div style={{ position: 'relative', height, borderRadius: 8, overflow: 'hidden' }} ref={host}>
      <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        color: '#e8f0f7', font: '13px system-ui', zIndex: 1, pointerEvents: 'none' }}>
        <span style={{ pointerEvents: 'auto' }}>
          <button onClick={() => resetView.current()}>Reset view</button>{' '}
          <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : host.current?.requestFullscreen())}>Full screen</button>
        </span>
        <label style={{ pointerEvents: 'auto' }}>Vertical exaggeration ×{exag.toFixed(0)}{' '}
          <input type="range" min={1} max={200} value={exag} onChange={e => setExag(Number(e.target.value))} />
        </label>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 8, color: '#e8f0f7', font: '12px system-ui', zIndex: 1, pointerEvents: 'none', maxWidth: 360 }}>
        <div style={{ height: 10, width: 200, background: `linear-gradient(90deg,${[0, .25, .5, .75, 1].map(css).join(',')})` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
          <span>{field.vmin.toFixed(2)}</span><span>{variable}{unit ? ` (${unit})` : ''}</span><span>{field.vmax.toFixed(2)}</span>
        </div>
        <div>White points: measured. Coloured volume: interpolated, only within {field.radius} km of a measurement; empty space is left empty.</div>
        {field.thinned && <div>Showing a thinned sample of {field.total.toLocaleString()} points to keep the GPU responsive.</div>}
      </div>
    </div>
  );
}
