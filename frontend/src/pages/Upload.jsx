import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentAPI } from '../utils/api';
import { renderFirstPageToCanvas, extractPDFText, analyzePDFContent } from '../utils/pdfHelper';

/* ─── tiny icon helpers ─────────────────────────────────────────────────── */
const Icon = ({ path, cls = 'w-5 h-5' }) => (
  <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const PATHS = {
  pdf:      'M7 21H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2h-4M7 21v-8h10v8M7 21H3M14 3v5h5',
  upload:   'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  eye:      'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  x:        'M6 18L18 6M6 6l12 12',
  check:    'M5 13l4 4L19 7',
  refresh:  'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  chevron:  'M19 9l-7 7-7-7',
  doc:      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  tag:      'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  file:     'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  list:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
};

const fmtSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ─── Processing step indicator ────────────────────────────────────────── */
const Step = ({ state, label }) => {
  const icon = state === 'done'    ? <Icon path={PATHS.check} cls="w-4 h-4 text-[#FF6A2A]" />
             : state === 'active'  ? <span className="w-4 h-4 border-2 border-[#FF6A2A] border-t-transparent rounded-full animate-spin inline-block" />
             :                       <span className="w-4 h-4 rounded-full border border-[#292929] inline-block" />;
  return (
    <div className={`flex items-center gap-2 text-sm ${state === 'pending' ? 'text-[#666666]' : state === 'active' ? 'text-[#F5F5F5]' : 'text-[#A0A0A0]'}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

/* ─── PDF Preview Modal ─────────────────────────────────────────────────── */
const PDFPreviewModal = ({ file, onClose }) => {
  const url = useRef(null);
  if (!url.current) url.current = URL.createObjectURL(file);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url.current;
    a.download = file.name;
    a.click();
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(7,7,7,0.96)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#292929] bg-[#0D0D0D] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FF6A2A]/10 border border-[#FF6A2A]/20">
            <Icon path={PATHS.pdf} cls="w-4 h-4 text-[#FF6A2A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F5F5F5] truncate max-w-xs">{file.name}</p>
            <p className="text-xs text-[#666666]">{fmtSize(file.size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#FF6A2A]/40 text-[#FF6A2A] text-sm font-medium hover:bg-[#FF6A2A] hover:text-[#070707] transition-all"
          >
            <Icon path={PATHS.download} cls="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[#292929] text-[#A0A0A0] hover:border-[#F5F5F5] hover:text-[#F5F5F5] transition-all"
          >
            <Icon path={PATHS.x} cls="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* PDF iframe */}
      <div className="flex-1 overflow-hidden p-4">
        <iframe
          src={url.current + '#toolbar=1&navpanes=1'}
          className="w-full h-full rounded-xl border border-[#292929]"
          title="PDF Preview"
        />
      </div>
    </div>
  );
};

/* ─── Main Upload component ─────────────────────────────────────────────── */
const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // PDF analysis state
  const [pdfFile, setPdfFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null); // base64 data URL
  const [numPages, setNumPages] = useState(null);
  const [analysisSteps, setAnalysisSteps] = useState(null); // null = not started
  const [overview, setOverview] = useState(null);

  const [formData, setFormData] = useState({
    file: null,
    title: '',
    description: '',
    content_type: 'report',
    expedition_name: '',
    year: '',
    category: 'general',
    tags: ''
  });

  const contentTypes = ['report', 'photo', 'video', 'dataset', 'publication'];
  const categories   = ['glaciology', 'ocean', 'atmosphere', 'biology', 'general'];

  const getFileTypeAccept = (ct) => {
    const map = {
      report: 'application/pdf',
      photo: 'image/jpeg,image/png,image/gif',
      video: 'video/mp4,video/webm',
      dataset: '.csv,.json,.xlsx',
      publication: 'application/pdf'
    };
    return map[ct] || '*/*';
  };

  const isPDFType = (ct) => ct === 'report' || ct === 'publication';

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files ? files[0] : value }));
  };

  /* ── Process a chosen/dropped PDF ── */
  const processFile = useCallback(async (file) => {
    if (!file) return;

    setFormData(prev => ({ ...prev, file }));
    setPdfFile(file);
    setThumbnail(null);
    setOverview(null);

    if (!isPDFType(formData.content_type) || file.type !== 'application/pdf') return;

    // Step: uploaded
    setAnalysisSteps({ uploaded: 'done', extracted: 'active', overview: 'pending', findings: 'pending' });

    try {
      // Render first page thumbnail
      const renderResult = await renderFirstPageToCanvas(file);
      if (renderResult) {
        setThumbnail(renderResult.dataURL);
        setNumPages(renderResult.numPages);
      }

      // Extract text
      const { text, numPages: pages } = await extractPDFText(file);
      setNumPages(pages);
      setAnalysisSteps(s => ({ ...s, extracted: 'done', overview: 'active' }));

      // Analyze
      await new Promise(r => setTimeout(r, 400)); // brief deliberate pause for UX
      const result = analyzePDFContent(text, file.name, pages);
      setAnalysisSteps(s => ({ ...s, overview: 'done', findings: 'active' }));

      await new Promise(r => setTimeout(r, 300));
      setAnalysisSteps(s => ({ ...s, findings: 'done' }));
      setOverview(result);

      // Pre-fill form fields only if user hasn't typed anything
      if (result) {
        setFormData(prev => ({
          ...prev,
          title: prev.title === '' ? result.title : prev.title,
          description: prev.description === '' ? result.summary : prev.description,
          year: prev.year === '' && result.year !== 'Not available in document' ? result.year : prev.year,
          category: result.category !== 'general' ? result.category : prev.category,
          tags: prev.tags === '' && result.topics?.length ? result.topics.slice(0, 5).join(', ') : prev.tags
        }));
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisSteps(s => s ? { ...s, extracted: 'done', overview: 'done', findings: 'done' } : null);
    }
  }, [formData.content_type]);

  /* ── Drag handlers ── */
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  /* ── Form submit (preserves original logic) ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = new FormData();
      data.append('file', formData.file);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('content_type', formData.content_type);
      data.append('expedition_name', formData.expedition_name);
      data.append('year', formData.year);
      data.append('category', formData.category);
      data.append('tags', formData.tags);
      const response = await contentAPI.upload(data);
      setSuccess(true);
      setTimeout(() => navigate(`/content/${response.data.id}`), 2000);
    } catch (err) {
      setError('Failed to upload content. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfFile) return;
    const url = URL.createObjectURL(pdfFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfFile.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const allStepsDone = analysisSteps && Object.values(analysisSteps).every(v => v === 'done');

  return (
    <>
      {showPreviewModal && pdfFile && (
        <PDFPreviewModal file={pdfFile} onClose={() => setShowPreviewModal(false)} />
      )}

      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display text-[#F5F5F5] mb-1 tracking-tight">Upload Content</h1>
          <p className="text-[#666666] text-base">Add reports, datasets, publications, or media to the NCPOR repository.</p>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-3 bg-[#181818] border border-[#292929] text-[#F5F5F5] px-5 py-3.5 rounded-xl mb-6">
            <div className="p-1 rounded-full bg-[#FF6A2A]/10"><Icon path={PATHS.check} cls="w-4 h-4 text-[#FF6A2A]" /></div>
            <span className="font-medium text-sm">Content uploaded successfully — redirecting…</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 bg-red-900/10 border border-red-500/20 text-red-400 px-5 py-3.5 rounded-xl mb-6">
            <Icon path="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ── TOP SECTION: file zone OR pdf card ── */}
          <div className="mb-6">
            {!pdfFile ? (
              /* ── Drop Zone ── */
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666]">File *</label>
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center py-16 px-6 ${
                    dragging
                      ? 'border-[#FF6A2A] bg-[#FF6A2A]/5'
                      : 'border-[#292929] bg-[#0D0D0D] hover:border-[#FF6A2A]/40 hover:bg-[#FF6A2A]/3'
                  }`}
                >
                  <div className={`mb-5 p-4 rounded-2xl border transition-all ${dragging ? 'border-[#FF6A2A]/40 bg-[#FF6A2A]/10' : 'border-[#292929] bg-[#181818]'}`}>
                    <Icon path={PATHS.pdf} cls={`w-8 h-8 transition-colors ${dragging ? 'text-[#FF6A2A]' : 'text-[#666666]'}`} />
                  </div>
                  <p className="text-[#F5F5F5] font-semibold text-base mb-1">
                    {dragging ? 'Drop your file here' : 'Drag & drop your file here'}
                  </p>
                  <p className="text-[#666666] text-sm mb-5">or click to browse</p>
                  <div className="px-5 py-2.5 rounded-lg border border-[#292929] bg-[#181818] text-[#A0A0A0] text-sm font-medium hover:border-[#FF6A2A] hover:text-[#FF6A2A] transition-all">
                    Choose File
                  </div>
                  <p className="text-[#666666] text-xs mt-5">Accepted: <span className="text-[#A0A0A0] font-mono">{getFileTypeAccept(formData.content_type)}</span></p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="file"
                  accept={getFileTypeAccept(formData.content_type)}
                  onChange={onFileChange}
                  className="hidden"
                  required
                />
              </div>
            ) : (
              /* ── PDF + Overview two-col layout ── */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* LEFT: PDF card (2/5) */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  {/* PDF document card */}
                  <div className="rounded-2xl border border-[#292929] bg-[#0D0D0D] overflow-hidden">
                    {/* Header strip */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#292929]">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#FF6A2A]/10 border border-[#FF6A2A]/20">
                          <Icon path={PATHS.pdf} cls="w-3.5 h-3.5 text-[#FF6A2A]" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-[#FF6A2A]">PDF Document</span>
                      </div>
                      {allStepsDone && (
                        <div className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
                          <Icon path={PATHS.check} cls="w-3.5 h-3.5 text-[#FF6A2A]" />
                          <span>Ready</span>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail area */}
                    <div className="relative bg-[#0A0A0A] aspect-[3/4] flex items-center justify-center overflow-hidden">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt="PDF first page"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-[#666666]">
                          <Icon path={PATHS.doc} cls="w-12 h-12 text-[#292929]" />
                          <span className="text-xs">Rendering preview…</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata strip */}
                    <div className="px-4 py-3 border-t border-[#292929] space-y-1.5">
                      <p className="text-[#F5F5F5] text-sm font-semibold truncate leading-snug">{pdfFile.name}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-[#A0A0A0] bg-[#181818] border border-[#292929] px-2 py-0.5 rounded">PDF</span>
                        <span className="text-xs text-[#A0A0A0]">{fmtSize(pdfFile.size)}</span>
                        {numPages && <span className="text-xs text-[#A0A0A0]">{numPages} pages</span>}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 px-4 pb-4 pt-1">
                      {isPDFType(formData.content_type) && (
                        <button
                          type="button"
                          onClick={() => setShowPreviewModal(true)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#FF6A2A] text-[#070707] text-sm font-semibold hover:bg-[#FF7A3D] transition-all"
                        >
                          <Icon path={PATHS.eye} cls="w-4 h-4" />
                          Open Preview
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#FF6A2A]/40 text-[#FF6A2A] text-sm font-semibold hover:bg-[#FF6A2A] hover:text-[#070707] transition-all"
                      >
                        <Icon path={PATHS.download} cls="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Replace file link */}
                  <button
                    type="button"
                    onClick={() => {
                      setPdfFile(null); setThumbnail(null); setOverview(null);
                      setAnalysisSteps(null); setNumPages(null);
                      setFormData(prev => ({ ...prev, file: null }));
                    }}
                    className="text-xs text-[#666666] hover:text-[#A0A0A0] underline text-center transition-colors"
                  >
                    Replace file
                  </button>
                </div>

                {/* RIGHT: Overview panel (3/5) */}
                <div className="lg:col-span-3 flex flex-col gap-4">

                  {/* Processing steps */}
                  {analysisSteps && !allStepsDone && (
                    <div className="rounded-xl border border-[#292929] bg-[#0D0D0D] px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-3">Analyzing Document…</p>
                      <div className="space-y-2">
                        <Step state={analysisSteps.uploaded}  label="PDF uploaded" />
                        <Step state={analysisSteps.extracted} label="Text extracted" />
                        <Step state={analysisSteps.overview}  label="Generating overview" />
                        <Step state={analysisSteps.findings}  label="Extracting key findings" />
                      </div>
                    </div>
                  )}

                  {allStepsDone && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#292929] bg-[#0D0D0D]">
                      <Icon path={PATHS.check} cls="w-4 h-4 text-[#FF6A2A]" />
                      <span className="text-sm text-[#A0A0A0] font-medium">Document analyzed</span>
                    </div>
                  )}

                  {overview && (
                    <div className="rounded-2xl border border-[#292929] bg-[#0D0D0D] overflow-hidden">
                      {/* Overview header */}
                      <div className="px-5 py-4 border-b border-[#292929]">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[#FF6A2A] mb-0.5">Document Overview</p>
                        <p className="text-[#F5F5F5] font-semibold text-base leading-snug">{overview.title}</p>
                      </div>

                      <div className="px-5 py-4 space-y-5">
                        {/* Metadata pills */}
                        <div className="flex flex-wrap gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-[#A0A0A0] bg-[#181818] border border-[#292929] px-3 py-1 rounded-full">
                            <Icon path={PATHS.file} cls="w-3 h-3" />{overview.docType}
                          </span>
                          {numPages && (
                            <span className="flex items-center gap-1.5 text-xs text-[#A0A0A0] bg-[#181818] border border-[#292929] px-3 py-1 rounded-full">
                              <Icon path={PATHS.doc} cls="w-3 h-3" />{numPages} pages
                            </span>
                          )}
                          {overview.year !== 'Not available in document' && (
                            <span className="flex items-center gap-1.5 text-xs text-[#A0A0A0] bg-[#181818] border border-[#292929] px-3 py-1 rounded-full">
                              <Icon path={PATHS.calendar} cls="w-3 h-3" />{overview.year}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-xs text-[#FF6A2A] bg-[#FF6A2A]/8 border border-[#FF6A2A]/20 px-3 py-1 rounded-full capitalize">
                            {overview.category}
                          </span>
                        </div>

                        {/* Summary */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Summary</p>
                          <p className="text-sm text-[#A0A0A0] leading-relaxed">{overview.summary}</p>
                        </div>

                        {/* Key Findings */}
                        {overview.findings?.length > 0 && overview.findings[0] !== 'Not available in document' && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Key Findings</p>
                            <ul className="space-y-1.5">
                              {overview.findings.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[#A0A0A0]">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#FF6A2A] shrink-0" />
                                  <span className="leading-relaxed">{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Topics */}
                        {overview.topics?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Key Topics</p>
                            <div className="flex flex-wrap gap-2">
                              {overview.topics.map((t, i) => (
                                <span key={i} className="text-xs text-[#A0A0A0] bg-[#181818] border border-[#292929] px-2.5 py-1 rounded-lg hover:border-[#FF6A2A]/30 transition-colors">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expedition / Location */}
                        {(overview.location !== 'Not available in document' || overview.expedition !== 'Not available in document') && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Expedition / Location</p>
                            <div className="rounded-xl border border-[#292929] bg-[#181818] p-4 space-y-2">
                              {overview.location !== 'Not available in document' && (
                                <div className="flex items-start gap-3 text-sm">
                                  <Icon path={PATHS.location} cls="w-4 h-4 text-[#FF6A2A] shrink-0 mt-0.5" />
                                  <div><span className="text-[#666666]">Location </span><span className="text-[#F5F5F5]">{overview.location}</span></div>
                                </div>
                              )}
                              {overview.expedition !== 'Not available in document' && (
                                <div className="flex items-start gap-3 text-sm">
                                  <Icon path={PATHS.list} cls="w-4 h-4 text-[#FF6A2A] shrink-0 mt-0.5" />
                                  <div><span className="text-[#666666]">Expedition </span><span className="text-[#F5F5F5]">{overview.expedition}</span></div>
                                </div>
                              )}
                              {overview.researchArea && overview.researchArea !== 'Not available in document' && (
                                <div className="flex items-start gap-3 text-sm">
                                  <Icon path={PATHS.tag} cls="w-4 h-4 text-[#FF6A2A] shrink-0 mt-0.5" />
                                  <div><span className="text-[#666666]">Research Area </span><span className="text-[#F5F5F5]">{overview.researchArea}</span></div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Metadata Form ── */}
          <div className="rounded-2xl border border-[#292929] bg-[#0D0D0D] p-6 space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#666666]">Document Metadata</p>

            {/* Content Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Content Type *</label>
              <div className="relative">
                <select
                  name="content_type"
                  value={formData.content_type}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#0A0A0A] text-[#F5F5F5] px-4 py-2.5 border border-[#292929] rounded-xl focus:outline-none focus:border-[#FF6A2A]/50 transition-all appearance-none text-sm"
                >
                  {contentTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#666666]">
                  <Icon path={PATHS.chevron} cls="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Title *</label>
              <input
                type="text" name="title" value={formData.title} onChange={handleChange} required
                className="w-full bg-[#0A0A0A] text-[#F5F5F5] px-4 py-2.5 border border-[#292929] rounded-xl focus:outline-none focus:border-[#FF6A2A]/50 transition-all placeholder:text-[#666666]/50 text-sm"
                placeholder="Enter content title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Description</label>
              <textarea
                name="description" value={formData.description} onChange={handleChange} rows={4}
                className="w-full bg-[#0A0A0A] text-[#F5F5F5] px-4 py-2.5 border border-[#292929] rounded-xl focus:outline-none focus:border-[#FF6A2A]/50 transition-all placeholder:text-[#666666]/50 resize-none text-sm"
                placeholder="Enter content description"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Category *</label>
                <div className="relative">
                  <select
                    name="category" value={formData.category} onChange={handleChange} required
                    className="w-full bg-[#0A0A0A] text-[#F5F5F5] px-4 py-2.5 border border-[#292929] rounded-xl focus:outline-none focus:border-[#FF6A2A]/50 transition-all appearance-none text-sm"
                  >
                    {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#666666]">
                    <Icon path={PATHS.chevron} cls="w-4 h-4" />
                  </div>
                </div>
              </div>
              {/* Year */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Year</label>
                <input
                  type="number" name="year" value={formData.year} onChange={handleChange} min="2000" max="2030"
                  className="w-full bg-[#0A0A0A] text-[#F5F5F5] px-4 py-2.5 border border-[#292929] rounded-xl focus:outline-none focus:border-[#FF6A2A]/50 transition-all placeholder:text-[#666666]/50 text-sm"
                  placeholder="e.g. 2024"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Expedition */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Expedition Name</label>
                <input
                  type="text" name="expedition_name" value={formData.expedition_name} onChange={handleChange}
                  className="w-full bg-[#0A0A0A] text-[#F5F5F5] px-4 py-2.5 border border-[#292929] rounded-xl focus:outline-none focus:border-[#FF6A2A]/50 transition-all placeholder:text-[#666666]/50 text-sm"
                  placeholder="e.g. ICE-2024"
                />
              </div>
              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#666666] mb-2">Tags</label>
                <input
                  type="text" name="tags" value={formData.tags} onChange={handleChange}
                  className="w-full bg-[#0A0A0A] text-[#F5F5F5] px-4 py-2.5 border border-[#292929] rounded-xl focus:outline-none focus:border-[#FF6A2A]/50 transition-all placeholder:text-[#666666]/50 text-sm"
                  placeholder="climate, Antarctica, research"
                />
              </div>
            </div>

            {/* Submit row */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#292929]">
              <button
                type="button" onClick={() => navigate('/')}
                className="px-5 py-2.5 border border-[#292929] text-[#A0A0A0] rounded-xl hover:bg-[#181818] hover:text-[#F5F5F5] transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#FF6A2A] text-[#070707] font-semibold rounded-xl hover:bg-[#FF7A3D] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Icon path={PATHS.upload} cls="w-4 h-4" />
                    <span>Upload to Repository</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default Upload;
