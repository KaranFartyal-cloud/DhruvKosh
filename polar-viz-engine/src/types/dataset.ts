export type FileFormat = 'csv' | 'esv' | 'xlsx' | 'json' | 'cnv' | 'netcdf' | 'hdf5';

export type VarRole =
  | 'latitude' | 'longitude' | 'depth' | 'pressure' | 'time' | 'station'
  | 'u' | 'v'      // current vector components
  | 'scalar';      // temperature, salinity, oxygen, ...

export interface Variable {
  name: string;
  role: VarRole;
  unit?: string;
  longName?: string;
  /** Dimension names. [] for tabular columns (all columns share the row axis). */
  dims: string[];
  /** Numeric data. Present for tabular columns and 1-D coordinate axes of gridded files.
   *  Gridded data variables stay in the worker and are fetched with a 'slice' request. */
  values?: Float64Array;
  /** Text columns (station names, flags) */
  labels?: string[];
  min?: number;
  max?: number;
  /** Number of values (rows, or product of dim sizes) */
  count: number;
}

export interface Dataset {
  id: string;
  name: string;
  format: FileFormat;
  layout: 'tabular' | 'gridded';
  rowCount: number;                       // tabular only (0 for gridded)
  dimensions: Record<string, number>;     // gridded only
  variables: Variable[];
  meta: Record<string, string>;           // header / global attributes
  warnings: string[];                     // things the user should know (assumptions, heuristics)
}

// ---------- Capability engine ----------

export type ModeId =
  | 'verticalProfile' | 'timeSeries' | 'histogram' | 'scatter' | 'map'
  | 'curtain' | 'depthSlice' | 'surfaceField' | 'vectorField' | 'rawTable'
  | 'surface3D' | 'vectorField3D' | 'volume3D' | 'isosurface3D';

export interface Capability {
  enabled: boolean;
  /** Shown as a tooltip on disabled mode buttons; explains what is missing. */
  reason: string;
}
export type CapabilityMap = Record<ModeId, Capability>;

export interface DensityReport {
  passed: boolean;
  points: number;
  casts: number;
  /** Fraction (0-1) of the data's bounding volume lying within `radiusKm` of a real observation */
  coverage: number;
  radiusKm: number;
  details: string;
}

export interface CapabilityConfig {
  minPoints3D: number;       // default 100
  minCasts3D: number;        // default 4
  minCoverage3D: number;     // default 0.15
  maxPointsGPU: number;      // default 100_000
  /** Horizontal km that equals 1 km of depth when measuring "closeness" (oceans are layered) */
  zScale: number;            // default 100
  defaultRadiusKm: number;   // max distance an interpolated value may be from a real measurement (default 50)
  radiusKm?: number;         // per-dataset override
}

// ---------- Worker protocol ----------

export type WorkerRequest =
  | { type: 'parse'; id: string; file: File }
  | { type: 'slice'; id: string; datasetId: string; variable: string; fixed: Record<string, number> };

export type WorkerResponse =
  | { type: 'progress'; id: string; stage: string; fraction: number }
  | { type: 'dataset'; id: string; dataset: Dataset }
  | { type: 'slice'; id: string; dims: string[]; shape: number[]; values: Float64Array }
  | { type: 'error'; id: string; message: string };
