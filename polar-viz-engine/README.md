# Polar Viz Engine (SIH 26063)

Browser-side engine that parses oceanographic files, decides which visualizations are scientifically valid, and renders them.

## Structure
```
src/
  types/dataset.ts            Dataset / Variable / capability / worker-message types
  engine/spatial.ts           projection, spatial hash, coverage check, bounded IDW, adaptive downsampling
  engine/capabilityEngine.ts  rule-based mode activator + 3D density gate
  workers/parser.worker.ts    CSV/ESV/XLSX/JSON/CNV/NetCDF3/NetCDF4+HDF5 parsing, role detection, lazy slicing
  components/VolumeField3D.tsx  3D volume with white observation points (three.js)
  components/MapView.tsx        2D geographic view (polar/flat projection, pan/zoom, optional colouring)
  engine/colormap.ts            shared colour scale
  components/DatasetViewer.tsx  drop-in component: parse + capability check + mode picker + views
```

## Quick start for the portal team (React + TypeScript)
1. Copy `src/types`, `src/engine`, `src/workers`, `src/components` into your project's `src`.
2. `npm install three papaparse xlsx netcdfjs h5wasm` (plus `@types/three @types/papaparse`).
3. On the dataset page, add one line:
```tsx
import DatasetViewer from './components/DatasetViewer';
<DatasetViewer file={file} />        // a File from an upload / drag-and-drop
<DatasetViewer url={dataset.url} />  // or a URL the portal already stores (must allow CORS)
```
It reads the file in a Web Worker, shows only the views that are valid for that data (with reasons for the rest),
and opens the 3D volume view when it is allowed. Next.js: load it with `dynamic(() => import(...), { ssr: false })`.

## Lower-level use (without DatasetViewer)
```ts
const worker = new Worker(new URL('./workers/parser.worker.ts', import.meta.url), { type: 'module' });
worker.onmessage = e => {
  if (e.data.type !== 'dataset') return;
  const { modes, density } = evaluateCapabilities(e.data.dataset);   // modes[x].enabled / .reason
  // render <VolumeField3D dataset={e.data.dataset} variable="t090C" /> if modes.volume3D.enabled
};
worker.postMessage({ type: 'parse', id: crypto.randomUUID(), file });  // file from <input type="file">
// gridded files: worker.postMessage({ type:'slice', id, datasetId, variable:'temp', fixed:{ time:0, depth:10 } })
```

## How the 3D safeguard works
3D modes turn on only if: >=100 valid points, >=4 casts, and >=15% of the data's bounding volume lies within
`defaultRadiusKm` (50) of a real measurement. The radius is fixed, not derived from station spacing, so sparse
surveys are blocked rather than auto-stretched. Interpolated cells exist only inside that radius; measured
points are drawn as white points at their exact coordinates. Vertical exaggeration only scales the display.
All thresholds are in `CapabilityConfig`.

## Column detection
Roles are matched by whole words in the column name, long name and unit, so `Latitude`, `LAT`, `lat_deg`, `Lon_E`,
`Depth_m`, `Pressure (dbar)`, `Elevation` and similar need no renaming. Values are sanity-checked (a "lat" column
outside -90..90 is demoted with a warning). If a dataset has lat/lon but no depth/pressure/elevation, the viewer says so
and offers the 2D map (polar stereographic for polar data) instead of a bare "3D unavailable". The "Detected columns"
panel in `DatasetViewer` shows what was recognised.

## Assumptions to confirm
- **ESV** is read as a delimited text table; **"CERT"** has no parser (the format was unclear, probably a typo).
- Pressure is treated as ~1 m per dbar when no depth column exists.
- HDF5 dimension names are inferred by matching array lengths to coordinate variables.
- The 50 km radius, 15% coverage and the 100x depth scaling are starting values; tune them with an oceanographer.

## Not built yet
IndexedDB caching, low-bandwidth JSON/SVG previews, and the other 2D/3D modes (Plotly profile, curtain, depth slice,
isosurface, current vectors). The capability engine already decides when each is available.

## Verified
Capability engine, spatial utilities and CNV parsing were run on synthetic data; the worker and both components
typecheck. Not yet run against real NetCDF/HDF5 files or in a browser (no npm access where this was built).
