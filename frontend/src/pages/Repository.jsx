import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { contentAPI } from '../utils/api';
import ContentThumbnail from '../components/ContentThumbnail';

/* ── Content card ───────────────────────────────────────────────────────── */
const ContentCard = ({ item, index }) => {
  return (
    <Link
      to={`/content/${item.id}`}
      className="group bg-ncpor-panel border border-ncpor-divider rounded-xl overflow-hidden
        flex flex-col sweep-hover
        hover:-translate-y-[3px] hover:border-ncpor-accent/40 hover:shadow-premium-hover
        transition-all duration-220 ease-out
        animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 55, 400)}ms` }}
    >
      {/* Thumbnail */}
      <div className="relative h-[200px] bg-ncpor-sidebar flex items-center justify-center overflow-hidden">
        <ContentThumbnail item={item} />
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-0.5 bg-ncpor-divider text-ncpor-primary rounded text-[10px] uppercase font-bold tracking-wider">
            {item.category}
          </span>
          <span className="px-2 py-0.5 bg-ncpor-panel border border-ncpor-divider text-ncpor-primary rounded text-[10px] uppercase font-bold tracking-wider">
            {item.content_type}
          </span>
          {item.year && (
            <span className="px-2 py-0.5 border border-ncpor-divider text-ncpor-secondary rounded text-[10px] uppercase font-bold tracking-wider">
              {item.year}
            </span>
          )}
        </div>

        <h3 className="font-display text-base text-ncpor-primary mb-auto line-clamp-2
          group-hover:text-ncpor-accent transition-colors duration-220">
          {item.title}
        </h3>

        <div className="mt-4 pt-4 border-t border-ncpor-divider/50">
          <p className="text-xs font-medium text-ncpor-muted uppercase tracking-widest truncate">
            {item.expedition_name || 'NCPOR Archive'}
          </p>
        </div>
      </div>
    </Link>
  );
};

/* ── Repository ─────────────────────────────────────────────────────────── */
const Repository = () => {
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtering, setFiltering] = useState(false); // for filter transition
  const [error, setError]         = useState(null);
  const [gridKey, setGridKey]     = useState(0); // re-key grid to replay animations

  const [category,    setCategory]    = useState('');
  const [year,        setYear]        = useState('');
  const [contentType, setContentType] = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);

  const categories   = ['', 'glaciology', 'ocean', 'atmosphere', 'biology', 'general'];
  const contentTypes = ['', 'report', 'photo', 'video', 'dataset', 'publication'];
  const years        = ['', '2024', '2023', '2022', '2021', '2020'];

  const debouncedSearch = useRef(search);

  useEffect(() => {
    const t = setTimeout(() => { debouncedSearch.current = search; }, 500);
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
          search:       search       || undefined,
          page,
          page_size: 20
        };
        const response = await contentAPI.getAll(params);
        // brief pause so the fade-out is visible
        await new Promise(r => setTimeout(r, 120));
        setContentItems(response.data);
        setGridKey(k => k + 1); // replay card entrance
        setError(null);
      } catch (err) {
        setError('Failed to load content. Please try again.');
        console.error('Error fetching content:', err);
      } finally {
        setFiltering(false);
        setLoading(false);
      }
    };
    fetchContent();
  }, [category, year, contentType, search, page]);

  /* ── Filter change handlers (reset page) ── */
  const handleCategoryChange    = (v) => { setCategory(v);    setPage(1); };
  const handleYearChange        = (v) => { setYear(v);        setPage(1); };
  const handleContentTypeChange = (v) => { setContentType(v); setPage(1); };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ncpor-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded animate-shake">
        {error}
      </div>
    );
  }

  const selectCls = `w-full bg-ncpor-sidebar text-ncpor-primary px-4 py-2.5 border border-ncpor-divider rounded-lg
    focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15
    transition-all duration-220 appearance-none text-sm`;

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row gap-7">

        {/* ── Filters sidebar ── */}
        <div className="lg:w-64 flex-shrink-0 animate-fade-up" style={{ animationDelay: '40ms' }}>
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 sticky top-4">
            <h3 className="text-sm font-display font-semibold text-ncpor-primary mb-5 tracking-tight">Filters</h3>
            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ncpor-secondary mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search content..."
                  defaultValue={search}
                  className={`${selectCls} placeholder:text-ncpor-muted/50`}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ncpor-secondary mb-2">Category</label>
                <select value={category} onChange={(e) => handleCategoryChange(e.target.value)} className={selectCls}>
                  {categories.map(c => (
                    <option key={c} value={c}>{c ? c.charAt(0).toUpperCase() + c.slice(1) : 'All'}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ncpor-secondary mb-2">Year</label>
                <select value={year} onChange={(e) => handleYearChange(e.target.value)} className={selectCls}>
                  {years.map(y => <option key={y} value={y}>{y || 'All'}</option>)}
                </select>
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ncpor-secondary mb-2">Content Type</label>
                <select value={contentType} onChange={(e) => handleContentTypeChange(e.target.value)} className={selectCls}>
                  {contentTypes.map(t => (
                    <option key={t} value={t}>{t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All'}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => { setCategory(''); setYear(''); setContentType(''); setSearch(''); setPage(1); }}
                className="w-full bg-transparent text-ncpor-secondary border border-ncpor-divider py-2.5 px-4 rounded-lg
                  hover:border-ncpor-accent hover:text-ncpor-accent
                  active:scale-[0.98] transition-all duration-150 font-medium text-sm mt-2"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* ── Content grid ── */}
        <div className="flex-1">
          {/* Heading */}
          <div className="mb-7 animate-fade-up" style={{ animationDelay: '0ms' }}>
            <h1 className="text-3xl font-display text-ncpor-primary mb-1 tracking-tight">Content Repository</h1>
            <p className="text-ncpor-secondary text-base">Explore NCPOR's scientific knowledge and institutional archive.</p>
          </div>

          {/* Filter loading bar */}
          {filtering && (
            <div className="w-full h-[2px] bg-ncpor-divider rounded-full mb-5 overflow-hidden">
              <div className="h-full bg-ncpor-accent rounded-full w-1/3 animate-slide-right" />
            </div>
          )}

          {contentItems.length === 0 && !filtering ? (
            <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-12 text-center animate-fade-up">
              <div className="text-ncpor-muted/20 text-7xl mb-6">📂</div>
              <h3 className="text-xl font-display font-semibold text-ncpor-primary mb-3">No content found</h3>
              <p className="text-ncpor-secondary mb-8 max-w-md mx-auto text-sm">
                Upload your first scientific report, dataset, or publication to populate the repository.
              </p>
              <Link
                to="/upload"
                className="inline-block bg-ncpor-accent text-ncpor-bg font-semibold py-2.5 px-8 rounded-lg
                  hover:bg-ncpor-accentBright active:scale-[0.98] transition-all duration-150 text-sm"
              >
                Upload Content
              </Link>
            </div>
          ) : (
            <>
              {/* Card grid — re-keyed on filter change to replay animations */}
              <div
                key={gridKey}
                className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity duration-200 ${filtering ? 'opacity-40' : 'opacity-100'}`}
              >
                {contentItems.map((item, i) => (
                  <ContentCard key={item.id} item={item} index={i} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center mt-10 space-x-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-5 py-2.5 bg-ncpor-panel border border-ncpor-divider text-ncpor-primary font-medium rounded-lg
                    hover:border-ncpor-accent hover:text-ncpor-accent
                    disabled:opacity-40 disabled:cursor-not-allowed
                    active:scale-[0.98] transition-all duration-150 text-sm"
                >
                  Previous
                </button>
                <span className="px-5 py-2.5 bg-ncpor-sidebar text-ncpor-primary border border-ncpor-divider rounded-lg font-semibold text-sm">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={contentItems.length < 20}
                  className="px-5 py-2.5 bg-ncpor-panel border border-ncpor-divider text-ncpor-primary font-medium rounded-lg
                    hover:border-ncpor-accent hover:text-ncpor-accent
                    disabled:opacity-40 disabled:cursor-not-allowed
                    active:scale-[0.98] transition-all duration-150 text-sm"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Repository;
