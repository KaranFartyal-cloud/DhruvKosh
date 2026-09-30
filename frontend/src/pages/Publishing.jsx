import React, { useState, useEffect } from 'react';
import publishAPI from '../api/publish';

const Publishing = () => {
  const [logs, setLogs] = useState([]);
  const [platforms, setPlatforms] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logRes, platRes] = await Promise.all([
        publishAPI.getPublishLog(),
        publishAPI.getPlatforms()
      ]);
      setLogs(logRes.data.items || []);
      setPlatforms(platRes.data);
    } catch (error) {
      console.error('Failed to fetch publishing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (logId) => {
    if (!window.confirm('Cancel this scheduled post?')) return;
    try {
      await publishAPI.cancelScheduled(logId);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to cancel');
    }
  };

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'scheduled': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'dry_run': return 'bg-ncpor-muted/10 text-ncpor-muted border-ncpor-divider';
      default: return 'bg-ncpor-muted/10 text-ncpor-muted border-ncpor-divider';
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display text-ncpor-primary mb-1 tracking-tight">Publishing Dashboard</h1>
        <p className="text-ncpor-secondary text-base">Track and manage your published content across platforms.</p>
      </div>

      {/* Mode indicator */}
      {platforms.publish_mode && (
        <div className="mb-8">
          <span className={`px-4 py-2 rounded-full font-bold text-sm ${platforms.publish_mode === 'dry_run' ? 'bg-ncpor-accent/10 border border-ncpor-accent/30 text-ncpor-accent' : 'bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse'}`}>
            {platforms.publish_mode === 'dry_run' ? 'DRY RUN MODE' : 'LIVE MODE - REAL POSTING ACTIVE'}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out">
          <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider mb-3">Total Posts</h3>
          <p className="text-5xl font-display text-ncpor-primary tabular-nums">{logs.length}</p>
        </div>
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out">
          <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider mb-3">Successful</h3>
          <p className="text-5xl font-display text-green-400 tabular-nums">{logs.filter(l => l.status === 'success').length}</p>
        </div>
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out">
          <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider mb-3">Failed</h3>
          <p className="text-5xl font-display text-red-400 tabular-nums">{logs.filter(l => l.status === 'failed').length}</p>
        </div>
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out">
          <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider mb-3">Scheduled</h3>
          <p className="text-5xl font-display text-blue-400 tabular-nums">{logs.filter(l => l.status === 'scheduled').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-ncpor-bg/50 border-b border-ncpor-divider">
              <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Time</th>
              <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Platform</th>
              <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Content ID</th>
              <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Post link</th>
              <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ncpor-divider">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-ncpor-muted">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-ncpor-muted">No publishing history found.</td></tr>
            ) : (
              logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-ncpor-bg/30 group transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ncpor-secondary">
                      {new Date(log.scheduled_at || log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} IST
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ncpor-primary capitalize">{log.platform}</span>
                        {log.text_preview && (
                          <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-ncpor-muted hover:text-ncpor-accent transition-colors" title="Toggle preview">
                            <svg className={`w-4 h-4 transform transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ncpor-accent hover:underline cursor-pointer" onClick={() => window.location.href=`/content/${log.generated_content_id}`}>
                      #{log.generated_content_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-sm">
                      {log.status === 'dry_run' ? (
                        <span className="text-ncpor-muted italic">Dry run: not published</span>
                      ) : log.status === 'failed' ? (
                        <span className="text-red-400 font-medium">{log.error_message || 'Failed'}</span>
                      ) : log.status === 'success' ? (
                        log.external_url === 'PRIVATE_TELEGRAM' ? (
                          <span className="text-ncpor-muted italic">No public link (private channel)</span>
                        ) : log.external_url ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <a href={log.external_url} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:underline font-medium inline-flex items-center gap-1">
                                View post <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                              </a>
                              <button onClick={() => handleCopy(log.external_url, log.id)} className="text-ncpor-muted hover:text-ncpor-secondary transition-colors" title="Copy link">
                                {copiedId === log.id ? (
                                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                )}
                              </button>
                            </div>
                            <div className="text-xs text-ncpor-muted truncate mt-1 max-w-[200px]" title={log.external_url}>{log.external_url}</div>
                          </div>
                        ) : (
                          <span className="text-ncpor-muted italic">Link unavailable</span>
                        )
                      ) : (
                        <span className="text-ncpor-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.status === 'scheduled' && (
                        <button onClick={() => handleCancel(log.id)} className="text-red-400 hover:text-red-300 font-semibold transition-colors">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && log.text_preview && (
                    <tr className="bg-ncpor-bg/30 border-b border-ncpor-divider">
                      <td colSpan="6" className="px-6 py-4 text-sm text-ncpor-secondary italic">
                        <div className="pl-4 border-l-2 border-ncpor-divider">
                          {log.text_preview}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Publishing;
