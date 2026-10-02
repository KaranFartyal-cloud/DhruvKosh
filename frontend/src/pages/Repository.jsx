import { useState, useEffect, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { contentAPI } from '../utils/api';
import ContentThumbnail from '../components/ContentThumbnail';
import PolarGlobeHero from '../components/PolarGlobeHero';

/* ── Content card ───────────────────────────────────────────────────────── */
const ContentCard = memo(({ item, index }) => {
  return (
    <Link
      to={`/content/${item.id}`}
      className="group bg-ncpor-panel border border-ncpor-divider rounded-xl overflow-hidden
        flex flex-col sweep-hover
        hover:-translate-y-1.5 hover:border-ncpor-accent/50
        transition-all duration-220 ease-out
        animate-fade-up"
      style={{ animationDelay: `${index < 8 ? index * 50 : 0}ms` }}
    >
      {/* Thumbnail Area */}
      <div className="relative h-[190px] bg-ncpor-elevated flex items-center justify-center overflow-hidden">
        <ContentThumbnail item={item} />
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Quiet, muted category/type/year pills (no bold all-caps) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="px-2 py-0.5 bg-ncpor-elevated text-ncpor-secondary border border-ncpor-divider/60 rounded text-[11px] capitalize font-medium">
            {item.category || 'General'}
          </span>
          <span className="px-2 py-0.5 bg-ncpor-elevated text-ncpor-secondary border border-ncpor-divider/60 rounded text-[11px] capitalize font-medium">
            {item.content_type || 'Record'}
          </span>
          {item.year && (
            <span className="px-2 py-0.5 bg-ncpor-elevated text-ncpor-muted border border-ncpor-divider/40 rounded text-[11px] font-mono">
              {item.year}
            </span>
          )}
        </div>

        <h3 className="font-display text-base font-medium text-ncpor-primary mb-auto line-clamp-2
          group-hover:text-ncpor-accent transition-colors duration-200">
          {item.title}
        </h3>

        <div className="mt-4 pt-3.5 border-t border-ncpor-divider/40 flex items-center justify-between">
          <p className="text-xs font-normal text-ncpor-muted truncate">
            {item.expedition_name || 'NCPOR Polar Archive'}
          </p>
        </div>
      </div>
    </Link>
  );
});

/* ── Repository ─────────────────────────────────────────────────────────── */
const Repository = () => {
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [error, setError]         = useState(null);
  const [gridKey, setGridKey]     = useState(0);

  const [category,    setCategory]    = useState('');
  const [year,        setYear]        = useState('');
  const [contentType, setContentType] = useState('');
  const [search,      setSearch]      = useState('');

  const categories   = ['', 'glaciology', 'ocean', 'atmosphere', 'biology', 'general'];
  const contentTypes = ['', 'report', 'photo', 'video', 'dataset', 'publication'];
  const years        = ['', '2024', '2023', '2022', '2021', '2020'];

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setFiltering(true);
        const params = {
          category:     category     || undefined,
          year:         year         || undefined,
          content_type: contentType  || undefined,
          search:       debouncedSearch || undefined,
          page_size: 100
        };
        const response = await contentAPI.getAll(params);
        await new Promise(r => setTimeout(r, 120));
        setContentItems(response.data);
        setGridKey(k => k + 1);
        setError(null);
      } catch (err) {
        setError('Failed to load archive content. Please try again.');
        console.error('Error fetching content:', err);
      } finally {
        setFiltering(false);
        setLoading(false);
      }
    };
    fetchContent();
  }, [category, year, contentType, debouncedSearch]);

  /* ── Filter handlers ── */
  const handleCategoryChange    = (v) => setCategory(v);
  const handleYearChange        = (v) => setYear(v);
  const handleContentTypeChange = (v) => setContentType(v);

  const selectCls = `w-full bg-ncpor-panel text-ncpor-primary px-3.5 py-2 border border-ncpor-divider rounded-lg
    focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/20
    transition-all duration-200 appearance-none text-sm`;

  return (
    <div className="w-full flex flex-col bg-ncpor-bg transition-colors duration-300">
      
      {/* ── 1. Full-Width Polar Globe Hero (No container box, no rounded wrapper) ── */}
      <PolarGlobeHero
        onSearch={(query) => {
          setSearch(query);
          const el = document.getElementById('repository-explorer');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* ── 2. Repository Scientific Explorer Section ── */}
      <section id="repository-explorer" className="w-full border-t border-ncpor-divider/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Sticky Filters Sidebar (offset: header height 64px + 24px = top-[88px]) ── */}
            <aside className="lg:w-64 flex-shrink-0 animate-fade-up" style={{ animationDelay: '40ms' }}>
              <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 sticky top-[88px] transition-colors duration-300">
                <h3 className="text-sm font-display font-semibold text-ncpor-primary mb-5 tracking-tight">
                  Archive Filters
                </h3>
                
                <div className="space-y-4">
                  {/* Search */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1.5">Search Keywords</label>
                    <input
                      type="text"
                      placeholder="e.g. Ice core, Lidar..."
                      value={search}
                      className={`${selectCls} placeholder:text-ncpor-muted/60`}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1.5">Research Domain</label>
                    <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} className={selectCls}>
                      {categories.map(c => (
                        <option key={c} value={c}>{c ? c.charAt(0).toUpperCase() + c.slice(1) : 'All Domains'}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1.5">Expedition Year</label>
                    <select value={year} onChange={(e) => handleYearChange(e.target.value)} className={selectCls}>
                      {years.map(y => <option key={y} value={y}>{y ? `Year ${y}` : 'All Years'}</option>)}
                    </select>
                  </div>

                  {/* Content Type */}
                  <div>
                    <label className="block text-xs font-medium text-ncpor-secondary mb-1.5">Resource Type</label>
                    <select value={contentType} onChange={(e) => handleContentTypeChange(e.target.value)} className={selectCls}>
                      {contentTypes.map(t => (
                        <option key={t} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All Formats'}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => { setCategory(''); setYear(''); setContentType(''); setSearch(''); }}
                    className="w-full bg-transparent text-ncpor-secondary border border-ncpor-divider py-2 px-3 rounded-lg
                      hover:border-ncpor-accent hover:text-ncpor-accent
                      active:scale-[0.98] transition-all duration-150 font-medium text-xs mt-2"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Content Grid ── */}
            <main className="flex-1">
              {/* Heading */}
              <div className="mb-6 animate-fade-up" style={{ animationDelay: '0ms' }}>
                <h2 className="text-2xl font-display font-medium text-ncpor-primary mb-1 tracking-tight">
                  Scientific Knowledge Archive
                </h2>
                <p className="text-ncpor-secondary text-sm">
                  Explore NCPOR expeditions, datasets, research publications, and verified polar records.
                </p>
              </div>

              {/* Filter loading progress bar */}
              {filtering && (
                <div className="w-full h-[2px] bg-ncpor-divider rounded-full mb-5 overflow-hidden">
                  <div className="h-full bg-ncpor-accent rounded-full w-1/3 animate-slide-right" />
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-9 w-9 border-2 border-ncpor-divider border-t-ncpor-accent" />
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl animate-shake mb-6 text-sm">
                  {error}
                </div>
              ) : contentItems.length === 0 ? (
                <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-12 text-center animate-fade-up">
                  <div className="text-ncpor-muted/30 text-6xl mb-4">📂</div>
                  <h3 className="text-lg font-display font-medium text-ncpor-primary mb-2">No records found</h3>
                  <p className="text-ncpor-secondary mb-6 max-w-md mx-auto text-sm">
                    No matching scientific records match your filter criteria. Try adjusting keywords or domains.
                  </p>
                  <Link
                    to="/upload"
                    className="inline-block bg-ncpor-accent text-[#05080F] font-medium py-2 px-6 rounded-lg
                      hover:opacity-90 active:scale-[0.98] transition-all duration-150 text-sm shadow-sm"
                  >
                    Upload Record
                  </Link>
                </div>
              ) : (
                /* Card grid */
                <div
                  key={gridKey}
                  className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity duration-200 ${filtering ? 'opacity-40' : 'opacity-100'}`}
                >
                  {contentItems.map((item, i) => (
                    <ContentCard key={item.id} item={item} index={i} />
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Repository;
