import React, { useState, useEffect } from 'react';
import publishAPI from '../api/publish';

const Publishing = () => {
  const [logs, setLogs] = useState([]);
  const [platforms, setPlatforms] = useState({});
  const [loading, setLoading] = useState(true);

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
    <div className="max-w-7xl mx-auto py-8">
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
              <th className="px-6 py-4 font-semibold text-gray-600">Link/Error</th>
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
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(log.scheduled_at || log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-ncpor-primary capitalize">{log.platform}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer" onClick={() => window.location.href=`/content/${log.generated_content_id}`}>
                    #{log.generated_content_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm max-w-xs truncate">
                    {log.external_url ? (
                      <a href={log.external_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View Post ↗</a>
                    ) : log.error_message ? (
                      <span className="text-red-500" title={log.error_message}>{log.error_message}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.status === 'scheduled' && (
                      <button onClick={() => handleCancel(log.id)} className="text-red-500 hover:text-red-700 font-semibold">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Publishing;
