/// <reference lib="webworker" />
import type { Dataset, FileFormat, Variable, VarRole, WorkerRequest, WorkerResponse } from '../types/dataset';

const post = (m: WorkerResponse, t: Transferable[] = []) => (self as unknown as Worker).postMessage(m, t);
const progress = (id: string, stage: string, fraction: number) => post({ type: 'progress', id, stage, fraction });

// ---------- variable auto-detection ----------

export function detectRole(name: string, longName = '', unit = ''): VarRole {
  const n = name.toLowerCase().trim(), s = `${n} ${longName.toLowerCase()}`, u = unit.toLowerCase();
  if (/\blat(itude)?\b/.test(s) || u === 'degrees_north' || n === 'y_lat') return 'latitude';
  if (/\blon(g|gitude)?\b/.test(s) || u === 'degrees_east') return 'longitude';
  if (/^pr(dm|sm|de)?$|pressure|^pres$|^p_?db(ar)?$/.test(n) || /pressure/.test(longName.toLowerCase()) || u === 'dbar' || u === 'db') return 'pressure';
  if (/^dep|depth|^z$|^lev(el)?$/.test(n) || /depth/.test(longName.toLowerCase())) return 'depth';
  if (/^time|^date|timestamp|julian|^t$|^elapsed/.test(n) || /\bsince\b/.test(u)) return 'time';
  if (/station|^stn|^cast|profile_?id|^sta$/.test(n)) return 'station';
  if (/^(u|uo|ucur|u_?vel\w*|eastward\w*|east_?vel\w*|u_?comp\w*)$/.test(n)) return 'u';
  if (/^(v|vo|vcur|v_?vel\w*|northward\w*|north_?vel\w*|v_?comp\w*)$/.test(n)) return 'v';
  return 'scalar';
}

const FILLS = [-999, -9999, -99999, 9.96921e36, -9.99e-29, 1e35];
const isFill = (v: number) => !Number.isFinite(v) || FILLS.some(f => Math.abs(v - f) <= Math.abs(f) * 1e-6);

/** CF "seconds since 1970-01-01" -> epoch ms, if the unit parses. */
function cfTimeToMs(vals: Float64Array, unit: string): Float64Array {
  const m = /(second|minute|hour|day)s?\s+since\s+(.+)/i.exec(unit);
  if (!m) return vals;
  const base = Date.parse(m[2].trim().replace(' ', 'T') + (/[zZ+]/.test(m[2]) ? '' : 'Z'));
  if (!Number.isFinite(base)) return vals;
  const f = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5 }[m[1].toLowerCase() as 'second'];
  return vals.map(v => (Number.isFinite(v) ? base + v * f : NaN));
}

function finalize(v: Variable): Variable {
  if (v.values) {
    let min = Infinity, max = -Infinity;
    for (const x of v.values) if (Number.isFinite(x)) { if (x < min) min = x; if (x > max) max = x; }
    if (min <= max) { v.min = min; v.max = max; }
  }
  return v;
}

/** Build a column from raw cells: numeric if >=80% parse, else text labels. */
function column(name: string, cells: unknown[], unit?: string, longName?: string): Variable {
  const role = detectRole(name, longName, unit);
  const nums = cells.map(c => (typeof c === 'number' ? c : c === '' || c == null ? NaN : Number(c)));
  const good = nums.filter(Number.isFinite).length;
  const nonEmpty = cells.filter(c => c !== '' && c != null).length || 1;
  if (good / nonEmpty >= 0.8) {
    return finalize({ name, role, unit, longName, dims: [], count: cells.length,
      values: Float64Array.from(nums, x => (isFill(x) ? NaN : x)) });
  }
  if (role === 'time') { // ISO date strings
    return finalize({ name, role, unit, longName, dims: [], count: cells.length,
      values: Float64Array.from(cells, c => Date.parse(String(c))) });
  }
  return { name, role: role === 'scalar' ? 'station' : role, unit, longName, dims: [], count: cells.length, labels: cells.map(String) };
}

const splitUnit = (h: string): [string, string | undefined] => {
  const m = /^(.*?)\s*[\[(]([^\])]+)[\])]\s*$/.exec(h.trim());
  return m ? [m[1].trim() || h, m[2].trim()] : [h.trim(), undefined];
};

function tabular(id: string, name: string, format: FileFormat, header: string[], rows: unknown[][],
  meta: Record<string, string> = {}, extra?: Partial<Record<string, { unit?: string; longName?: string }>>): Dataset {
  const variables = header.map((h, c) => {
    const [n, u] = splitUnit(h);
    return column(n, rows.map(r => r[c]), extra?.[h]?.unit ?? u, extra?.[h]?.longName);
  });
  return { id, name, format, layout: 'tabular', rowCount: rows.length, dimensions: {}, variables, meta, warnings: [] };
}

// ---------- text / table formats ----------

async function parseDelimited(id: string, f: File, format: FileFormat): Promise<Dataset> {
  const Papa = (await import('papaparse')).default;
  const res = Papa.parse<string[]>(await f.text(), { skipEmptyLines: true, delimiter: '' }); // '' = auto-detect , ; tab |
  const [header, ...rows] = res.data;
  const ds = tabular(id, f.name, format, header, rows);
  ds.meta.delimiter = res.meta.delimiter;
  if (format === 'esv') ds.warnings.push('ESV is read as a delimited text table (delimiter auto-detected). Confirm this matches your instrument export.');
  return ds;
}

async function parseXlsx(id: string, f: File): Promise<Dataset> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
  const ds = tabular(id, f.name, 'xlsx', rows[0].map(String), rows.slice(1));
  ds.meta.sheet = wb.SheetNames[0];
  if (wb.SheetNames.length > 1) ds.warnings.push(`Workbook has ${wb.SheetNames.length} sheets; only "${wb.SheetNames[0]}" was read.`);
  return ds;
}

async function parseJson(id: string, f: File): Promise<Dataset> {
  const j = JSON.parse(await f.text());
  if (Array.isArray(j)) { // [{col: v, ...}, ...]
    const header = Object.keys(j[0] ?? {});
    return tabular(id, f.name, 'json', header, j.map(r => header.map(h => r[h])));
  }
  const header = Object.keys(j).filter(k => Array.isArray(j[k])); // {col: [..], ...}
  if (!header.length) throw new Error('JSON must be an array of records or an object of arrays.');
  const n = Math.max(...header.map(h => j[h].length));
  return tabular(id, f.name, 'json', header, Array.from({ length: n }, (_, i) => header.map(h => j[h][i])));
}

/** Sea-Bird .cnv: '*' / '#' header lines, '# name i = code: Description [unit]', data after *END*. */
async function parseCnv(id: string, f: File): Promise<Dataset> {
  const lines = (await f.text()).split(/\r?\n/);
  const names: string[] = [], info: Record<string, { unit?: string; longName?: string }> = {}, meta: Record<string, string> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const L = lines[i];
    if (/^\*END\*/.test(L)) { i++; break; }
    const nm = /^#\s*name\s+(\d+)\s*=\s*([^:]+):\s*(.*)$/.exec(L);
    if (nm) {
      const code = nm[2].trim(), [desc, unit] = splitUnit(nm[3]);
      names[Number(nm[1])] = code; info[code] = { unit, longName: desc };
    } else if (/^[*#]\s*[\w ]+=/.test(L)) {
      const [k, ...v] = L.replace(/^[*#]\s*/, '').split('='); meta[k.trim()] = v.join('=').trim();
    }
  }
  const rows = lines.slice(i).filter(l => l.trim()).map(l => l.trim().split(/\s+/));
  const ds = tabular(id, f.name, 'cnv', names, rows, meta, info);
  // Station position lives in the header, not as columns; broadcast it so map/curtain work.
  const pos = (h?: string) => { const m = h && /(\d+)\s+([\d.]+)\s*([NSEW])/.exec(h); return m ? (Number(m[1]) + Number(m[2]) / 60) * (/[SW]/.test(m[3]) ? -1 : 1) : NaN; };
  for (const [role, key, nm] of [['latitude', 'NMEA Latitude', 'latitude'], ['longitude', 'NMEA Longitude', 'longitude']] as const) {
    if (!ds.variables.some(v => v.role === role) && Number.isFinite(pos(meta[key]))) {
      ds.variables.push(finalize({ name: nm, role, unit: role === 'latitude' ? 'degrees_north' : 'degrees_east', dims: [],
        count: ds.rowCount, values: new Float64Array(ds.rowCount).fill(pos(meta[key])) }));
      ds.warnings.push(`${nm} taken from the file header (single cast).`);
    }
  }
  if (!ds.variables.some(v => v.role === 'depth' || v.role === 'pressure')) ds.warnings.push('No pressure/depth column found in this CNV.');
  return ds;
}

// ---------- router ----------

async function parse(req: Extract<WorkerRequest, { type: 'parse' }>) {
  const { id, file } = req, ext = file.name.split('.').pop()!.toLowerCase();
  progress(id, 'Reading file', 0.1);
  let ds: Dataset;
  if (ext === 'csv' || ext === 'txt') ds = await parseDelimited(id, file, 'csv');
  else if (ext === 'esv') ds = await parseDelimited(id, file, 'esv');
  else if (ext === 'xlsx' || ext === 'xls') ds = await parseXlsx(id, file);
  else if (ext === 'json') ds = await parseJson(id, file);
  else if (ext === 'cnv') ds = await parseCnv(id, file);
  else throw new Error(`Unsupported file type ".${ext}". Supported: csv, tsv, txt, esv, xlsx, json, cnv.`);
  
  progress(id, 'Detecting variables', 0.9);
  const transfer = ds.variables.flatMap(v => (v.values ? [v.values.buffer as ArrayBuffer] : []));
  post({ type: 'dataset', id, dataset: ds }, transfer);
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  try {
    if (e.data.type === 'parse') {
      await parse(e.data);
    }
  } catch (err) {
    post({ type: 'error', id: e.data.id, message: err instanceof Error ? err.message : String(err) });
  }
};
