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
      case 'success': return 'bg-green-100 text-green-800 border-green-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'dry_run': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display text-ncpor-primary">Publishing Dashboard</h1>
        {platforms.publish_mode && (
          <span className={`px-4 py-2 rounded-full font-bold text-sm ${platforms.publish_mode === 'dry_run' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800 animate-pulse'}`}>
            {platforms.publish_mode === 'dry_run' ? 'DRY RUN MODE' : 'LIVE MODE - REAL POSTING ACTIVE'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Posts</h3>
          <p className="text-3xl font-bold text-ncpor-primary">{logs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Successful</h3>
          <p className="text-3xl font-bold text-green-600">{logs.filter(l => l.status === 'success').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Failed</h3>
          <p className="text-3xl font-bold text-red-600">{logs.filter(l => l.status === 'failed').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Scheduled</h3>
          <p className="text-3xl font-bold text-blue-600">{logs.filter(l => l.status === 'scheduled').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 font-semibold text-gray-600">Time</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Platform</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Content ID</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Post link</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No publishing history found.</td></tr>
            ) : (
              logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-gray-50 group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(log.scheduled_at || log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} IST
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ncpor-primary capitalize">{log.platform}</span>
                        {log.text_preview && (
                          <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-gray-400 hover:text-blue-500" title="Toggle preview">
                            <svg className={`w-4 h-4 transform transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer" onClick={() => window.location.href=`/content/${log.generated_content_id}`}>
                      #{log.generated_content_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-sm">
                      {log.status === 'dry_run' ? (
                        <span className="text-gray-400 italic">Dry run: not published</span>
                      ) : log.status === 'failed' ? (
                        <span className="text-red-500 font-medium">{log.error_message || 'Failed'}</span>
                      ) : log.status === 'success' ? (
                        log.external_url === 'PRIVATE_TELEGRAM' ? (
                          <span className="text-gray-500 italic">No public link (private channel)</span>
                        ) : log.external_url ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <a href={log.external_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
                                View post <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                              </a>
                              <button onClick={() => handleCopy(log.external_url, log.id)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Copy link">
                                {copiedId === log.id ? (
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                )}
                              </button>
                            </div>
                            <div className="text-xs text-gray-400 truncate mt-1 max-w-[200px]" title={log.external_url}>{log.external_url}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Link unavailable</span>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.status === 'scheduled' && (
                        <button onClick={() => handleCancel(log.id)} className="text-red-500 hover:text-red-700 font-semibold">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && log.text_preview && (
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <td colSpan="6" className="px-6 py-4 text-sm text-gray-600 italic">
                        <div className="pl-4 border-l-2 border-gray-300">
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
