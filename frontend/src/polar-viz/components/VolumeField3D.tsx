import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Dataset } from '../types/dataset';
import { adaptiveSample, boundedIDW, bounds, extractPoints } from '../engine/spatial';
import { DEFAULT_CONFIG } from '../engine/capabilityEngine';
import { RotateCw, ZoomIn, ZoomOut, Layers, Eye } from 'lucide-react';

interface Props {
  dataset: Dataset;            // tabular CTD-style data (lat, lon, depth/pressure, scalar)
  variable: string;            // scalar to colour by, e.g. "t090C"
  radiusKm?: number;           // max distance an interpolated cell may be from a real measurement
  gridSize?: [number, number, number];
  height?: number;
}

const STOPS = [
  [0.267, 0.005, 0.329], // deep violet
  [0.23, 0.322, 0.546],  // ocean blue
  [0.128, 0.567, 0.551], // teal / cyan
  [0.369, 0.789, 0.383], // polar green
  [0.993, 0.906, 0.144]  // sunlit yellow
];

function colormap(t: number): [number, number, number] {
  const s = Math.min(Math.max(t, 0), 1) * (STOPS.length - 1);
  const i = Math.min(Math.floor(s), STOPS.length - 2);
  const f = s - i;
  return [0, 1, 2].map(k => STOPS[i][k] + (STOPS[i + 1][k] - STOPS[i][k]) * f) as [number, number, number];
}

const css = (t: number) => `rgb(${colormap(t).map(c => Math.round(c * 255)).join(',')})`;

export default function VolumeField3D({ dataset, variable, radiusKm, gridSize = [36, 36, 24], height = 500 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const root = useRef<THREE.Group | null>(null);
  const resetView = useRef<() => void>(() => {});
  const unit = dataset.variables.find(v => v.name === variable)?.unit;

  // 1. data -> thinned observations -> bounded interpolation (no GPU/DOM work here)
  const field = useMemo(() => {
    if (dataset.layout !== 'tabular') return { error: 'This visualizer renders tabular polar CTD-style measurements.' };
    const raw = extractPoints(dataset, variable);
    if (!raw) return { error: `Dataset requires latitude, longitude, depth/pressure and scalar variable "${variable}".` };
    const keep = adaptiveSample(raw.points, DEFAULT_CONFIG.maxPointsGPU);
    const pick = (a: Float32Array) => Float32Array.from(keep, i => a[i]);
    const points = { x: pick(raw.points.x), y: pick(raw.points.y), z: pick(raw.points.z) };
    const values = pick(raw.values);
    const radius = radiusKm ?? DEFAULT_CONFIG.defaultRadiusKm;
    const g = boundedIDW(points, values, radius, DEFAULT_CONFIG.zScale, gridSize);
    let vmin = Infinity, vmax = -Infinity;
    for (const v of values) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
    const b = bounds(points);
    const horiz = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], 1);
    const vert = Math.max(b.max[2] - b.min[2], 1e-3);
    return { points, values, g, radius, vmin, vmax, horiz, vert, thinned: keep.length < raw.values.length, total: raw.values.length };
  }, [dataset, variable, radiusKm, gridSize.join()]);

  const auto = 'error' in field ? 1 : Math.min(Math.max((0.3 * field.horiz) / field.vert, 1), 200);
  const [exag, setExag] = useState(auto);
  useEffect(() => setExag(auto), [auto]);

  // 2. build the three.js scene once per dataset
  useEffect(() => {
    if ('error' in field || !host.current) return;
    const el = host.current;
    const { points, g, values, vmin, vmax, horiz, vert } = field;
    
    // Clear any previous child canvases
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    
    const scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0x060c18);
    
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, horiz * 100);
    const controls = new OrbitControls(camera, renderer.domElement); 
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // world: X = east, Y = up (so depth is -Y), Z = -north. Centre on the data.
    const c = [0, 1, 2].map(k => (g.min[k] + g.max[k]) / 2);
    const world = (x: number, y: number, z: number) => [x - c[0], -(z - c[2]), -(y - c[1])];
    const group = new THREE.Group(); 
    root.current = group; 
    scene.add(group);

    // measured observations: white points at exact coordinates
    const pos = new Float32Array(points.x.length * 3);
    for (let i = 0; i < points.x.length; i++) {
      pos.set(world(points.x[i], points.y[i], points.z[i]), i * 3);
    }
    const pg = new THREE.BufferGeometry(); 
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const obs = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false }));
    obs.renderOrder = 2; 
    group.add(obs);

    // interpolated cells: coloured boxes, only where a measurement is within radius
    const [nx, ny, nz] = g.size;
    const cell = [0, 1, 2].map((k, i) => (g.size[i] > 1 ? (g.max[k] - g.min[k]) / (g.size[i] - 1) : 1));
    let count = 0; 
    for (const v of g.grid) if (Number.isFinite(v)) count++;

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.38, depthWrite: false }), 
      Math.max(count, 1)
    );
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color(); 
    let n = 0;
    
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          const v = g.grid[(i * ny + j) * nz + k]; 
          if (!Number.isFinite(v)) continue;
          const [wx, wy, wz] = world(g.min[0] + i * cell[0], g.min[1] + j * cell[1], g.min[2] + k * cell[2]);
          m4.compose(new THREE.Vector3(wx, wy, wz), new THREE.Quaternion(), new THREE.Vector3(cell[0], cell[2], cell[1]));
          mesh.setMatrixAt(n, m4); 
          mesh.setColorAt(n, col.setRGB(...colormap((v - vmin) / (vmax - vmin || 1)))); 
          n++;
        }
      }
    }
    
    mesh.count = n; 
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.renderOrder = 1; 
    group.add(mesh);

    // Add coordinate grid helper / bounding box
    const boxHelper = new THREE.Box3Helper(new THREE.Box3(
      new THREE.Vector3(g.min[0] - c[0], -(g.max[2] - c[2]), -(g.max[1] - c[1])),
      new THREE.Vector3(g.max[0] - c[0], -(g.min[2] - c[2]), -(g.min[1] - c[1]))
    ), new THREE.Color(0x00d2ff));
    group.add(boxHelper);

    const frame = () => { 
      camera.position.set(horiz * 1.1, horiz * 0.7, horiz * 1.2); 
      controls.target.set(0, 0, 0); 
      controls.update(); 
    };
    resetView.current = frame; 
    frame();

    const resize = () => { 
      if (!el) return;
      const w = el.clientWidth || 600;
      const h = el.clientHeight || height; 
      renderer.setSize(w, h); 
      camera.aspect = w / h; 
      camera.updateProjectionMatrix(); 
    };
    
    const ro = new ResizeObserver(resize); 
    ro.observe(el); 
    resize();

    let raf = 0; 
    const loop = () => { 
      raf = requestAnimationFrame(loop); 
      controls.update(); 
      renderer.render(scene, camera); 
    }; 
    loop();

    return () => {
      cancelAnimationFrame(raf); 
      ro.disconnect(); 
      controls.dispose();
      pg.dispose(); 
      mesh.geometry.dispose(); 
      (mesh.material as THREE.Material).dispose(); 
      (obs.material as THREE.Material).dispose();
      renderer.dispose(); 
      if (renderer.domElement.parentElement === el) {
        el.removeChild(renderer.domElement);
      }
      root.current = null;
    };
  }, [field]);

  // 3. update vertical scale
  useEffect(() => {
    if (root.current) {
      root.current.scale.set(1, exag, 1);
    }
  }, [exag]);

  if ('error' in field) {
    return (
      <div className="p-8 rounded-2xl bg-ncpor-panel border border-ncpor-divider text-center">
        <p className="text-amber-400 font-medium mb-2">3D Volume Notice</p>
        <p className="text-ncpor-muted text-sm">{field.error}</p>
      </div>
    );
  }

  const { vmin, vmax, radius, thinned, total } = field;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-ncpor-divider bg-[#060c18] shadow-2xl">
      {/* 3D WebGL Canvas container */}
      <div ref={host} style={{ width: '100%', height }} className="cursor-grab active:cursor-grabbing" />

      {/* Top Overlay Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-[#0b1622]/90 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-xl shadow-lg pointer-events-auto flex items-center gap-2 text-xs">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-ncpor-primary">{variable}</span>
          {unit && <span className="text-ncpor-muted">({unit})</span>}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
            {vmin.toFixed(2)} → {vmax.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => resetView.current()}
            className="p-2 rounded-xl bg-[#0b1622]/90 hover:bg-cyan-500/20 text-ncpor-secondary hover:text-cyan-300 border border-white/10 transition-all shadow-md active:scale-95 text-xs flex items-center gap-1.5"
            title="Reset Camera View"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset View</span>
          </button>
        </div>
      </div>

      {/* Colormap Legend Bar (Bottom Left) */}
      <div className="absolute bottom-4 left-4 bg-[#0b1622]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl pointer-events-auto z-10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] text-ncpor-muted font-mono">
          <span>{vmin.toFixed(2)}</span>
          <span className="text-cyan-300 font-bold px-2">{variable}</span>
          <span>{vmax.toFixed(2)}</span>
        </div>
        <div 
          className="h-2.5 w-48 rounded-md shadow-inner"
          style={{ background: `linear-gradient(to right, ${STOPS.map((_, i) => css(i / (STOPS.length - 1))).join(', ')})` }}
        />
        <div className="flex items-center justify-between text-[9px] text-ncpor-muted/80">
          <span>White dots: Observations</span>
          <span>Cutoff: {radius} km</span>
        </div>
      </div>

      {/* Depth Exaggeration Slider (Bottom Right) */}
      <div className="absolute bottom-4 right-4 bg-[#0b1622]/90 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl shadow-xl pointer-events-auto z-10 flex items-center gap-3">
        <span className="text-[11px] text-ncpor-secondary font-medium whitespace-nowrap">Vertical Scale:</span>
        <input
          type="range"
          min="1"
          max="200"
          value={exag}
          onChange={e => setExag(Number(e.target.value))}
          className="w-24 accent-cyan-400 cursor-pointer"
        />
        <span className="text-[11px] font-mono text-cyan-300 w-10 text-right">{Math.round(exag)}x</span>
      </div>
    </div>
  );
}
