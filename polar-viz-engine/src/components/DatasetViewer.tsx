import { useEffect, useMemo, useState } from 'react';
import type { Dataset, ModeId, WorkerResponse } from '../types/dataset';
import { evaluateCapabilities, MODE_LABELS } from '../engine/capabilityEngine';
import VolumeField3D from './VolumeField3D';

interface Props {
  /** Pass a File (from an <input type="file"> or a drag-and-drop)... */
  file?: File;
  /** ...or a URL to a dataset file the portal already stores. */
  url?: string;
  height?: number;
}

const ORDER: ModeId[] = ['volume3D', 'verticalProfile', 'timeSeries', 'map', 'curtain', 'depthSlice', 'surfaceField',
  'vectorField', 'histogram', 'scatter', 'surface3D', 'vectorField3D', 'isosurface3D', 'rawTable'];
const BUILT: ModeId[] = ['volume3D', 'rawTable']; // views implemented so far

type State =
  | { status: 'idle' }
  | { status: 'loading'; stage: string }
  | { status: 'ready'; dataset: Dataset }
  | { status: 'error'; message: string };

export default function DatasetViewer({ file, url, height = 560 }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [mode, setMode] = useState<ModeId | null>(null);
  const [variable, setVariable] = useState<string>('');

  // parse in a Web Worker so the page stays responsive
  useEffect(() => {
    if (!file && !url) { setState({ status: 'idle' }); return; }
    let cancelled = false;
    const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), { type: 'module' });
    const id = Math.random().toString(36).slice(2);
    setState({ status: 'loading', stage: 'Reading file' }); setMode(null);

    worker.onmessage = (e: { data: WorkerResponse }) => {
      if (cancelled || e.data.id !== id) return;
      if (e.data.type === 'progress') setState({ status: 'loading', stage: e.data.stage });
      else if (e.data.type === 'error') setState({ status: 'error', message: e.data.message });
      else if (e.data.type === 'dataset') setState({ status: 'ready', dataset: e.data.dataset });
    };
    worker.onerror = () => !cancelled && setState({ status: 'error', message: 'The file reader crashed. The file may be corrupt or too large.' });

    (async () => {
      try {
        let f = file;
        if (!f && url) {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Could not download the file (HTTP ${res.status}).`);
          f = new File([await res.blob()], decodeURIComponent(url.split('?')[0].split('/').pop() || 'dataset'));
        }
        if (!cancelled && f) worker.postMessage({ type: 'parse', id, file: f });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => { cancelled = true; worker.terminate(); };
  }, [file, url]);

  const dataset = state.status === 'ready' ? state.dataset : undefined;
  const caps = useMemo(() => (dataset ? evaluateCapabilities(dataset) : undefined), [dataset]);
  const scalars = dataset?.variables.filter(v => v.role === 'scalar' && v.values) ?? [];

  // choose sensible defaults once the dataset is ready
  useEffect(() => {
    if (!caps || !dataset) return;
    setMode(ORDER.find(m => caps.modes[m].enabled && BUILT.includes(m)) ?? ORDER.find(m => caps.modes[m].enabled) ?? null);
    setVariable(scalars[0]?.name ?? '');
  }, [caps]);

  if (state.status === 'idle') return <p>Choose a dataset file to visualize.</p>;
  if (state.status === 'loading') return <p role="status">{state.stage}...</p>;
  if (state.status === 'error') return <p role="alert">Could not open this file: {state.message}</p>;
  if (!dataset || !caps) return null;

  const unavailable = ORDER.filter(m => !caps.modes[m].enabled);

  return (
    <section style={{ font: '14px system-ui' }}>
      <p>
        <strong>{dataset.name}</strong> ({dataset.format.toUpperCase()},{' '}
        {dataset.layout === 'tabular' ? `${dataset.rowCount.toLocaleString()} rows` : 'gridded'},{' '}
        {dataset.variables.length} variables)
      </p>
      {dataset.warnings.map(w => <p key={w} style={{ color: '#8a5a00' }}>Note: {w}</p>)}

      <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
        {ORDER.filter(m => caps.modes[m].enabled).map(m => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            style={{ fontWeight: mode === m ? 700 : 400 }}>{MODE_LABELS[m]}</button>
        ))}
      </div>

      {scalars.length > 1 && mode === 'volume3D' && (
        <label>Variable{' '}
          <select value={variable} onChange={e => setVariable(e.target.value)}>
            {scalars.map(v => <option key={v.name} value={v.name}>{v.longName ?? v.name}{v.unit ? ` (${v.unit})` : ''}</option>)}
          </select>
        </label>
      )}

      {mode === 'volume3D' && variable && <VolumeField3D dataset={dataset} variable={variable} height={height} />}
      {mode === 'rawTable' && <RawTable dataset={dataset} />}
      {mode && !BUILT.includes(mode) && <p>The {MODE_LABELS[mode].toLowerCase()} view is available for this dataset but isn't built yet.</p>}
      {!mode && <p>No views are available for this file. See the reasons below.</p>}

      {unavailable.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary>Why are some views unavailable?</summary>
          <ul>{unavailable.map(m => <li key={m}><strong>{MODE_LABELS[m]}:</strong> {caps.modes[m].reason}</li>)}</ul>
        </details>
      )}
    </section>
  );
}

function RawTable({ dataset }: { dataset: Dataset }) {
  const cols = dataset.variables.filter(v => v.values || v.labels), n = Math.min(dataset.rowCount, 25);
  if (dataset.layout !== 'tabular') return <p>Raw table is only available for tabular files.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead><tr>{cols.map(c => <th key={c.name} style={{ padding: '2px 8px', textAlign: 'left' }}>{c.name}{c.unit ? ` (${c.unit})` : ''}</th>)}</tr></thead>
        <tbody>{Array.from({ length: n }, (_, i) => (
          <tr key={i}>{cols.map(c => <td key={c.name} style={{ padding: '2px 8px' }}>
            {c.labels ? c.labels[i] : Number.isFinite(c.values![i]) ? Number(c.values![i].toPrecision(6)) : ''}</td>)}</tr>
        ))}</tbody>
      </table>
      {dataset.rowCount > n && <p>Showing the first {n} of {dataset.rowCount.toLocaleString()} rows.</p>}
    </div>
  );
}
