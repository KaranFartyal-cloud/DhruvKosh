import React, { useState, useEffect } from 'react';
import publishAPI from '../api/publish';

const PublishPanel = ({ post, onPublishSuccess }) => {
  const [platforms, setPlatforms] = useState({ configured_platforms: [], publish_mode: 'dry_run' });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState([]); // from API
  const [localText, setLocalText] = useState(post.generated_text);

  useEffect(() => {
    setLocalText(post.generated_text);
  }, [post.generated_text]);

  useEffect(() => {
    publishAPI.getPlatforms().then(res => {
      setPlatforms(res.data);
      if (res.data.configured_platforms.includes(post.platform)) {
        setSelectedPlatforms([post.platform]);
      } else if (res.data.configured_platforms.length > 0) {
        setSelectedPlatforms([res.data.configured_platforms[0]]);
      }
    }).catch(e => console.error(e));
    
    fetchStatus();
  }, [post.id, post.platform]);

  const fetchStatus = () => {
    publishAPI.getPublishStatus(post.id).then(res => {
      setPublishStatus(res.data);
    }).catch(e => console.error(e));
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      await publishAPI.publishContent(post.id, {
        platforms: selectedPlatforms,
        media_id: post.suggested_media_id,
        scheduled_at: scheduleDate ? new Date(scheduleDate).toISOString() : null
      });
      setIsModalOpen(false);
      fetchStatus();
      if (onPublishSuccess) onPublishSuccess();
    } catch (e) {
      alert('Failed to publish: ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };
  
  const allPlatforms = ['twitter', 'telegram', 'mastodon', 'bluesky', 'linkedin', 'facebook', 'instagram'];
  const isApproved = post.status === 'approved' || post.status === 'published';

  return (
    <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 mt-6">
      <h3 className="text-xl font-display text-ncpor-primary mb-4">Publish Content</h3>
      
      {!isApproved && (
        <div className="bg-yellow-900/20 text-yellow-500 p-3 rounded mb-4 text-sm font-medium">
          Content must be Approved before it can be published.
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-semibold uppercase tracking-wider text-ncpor-secondary mb-2">Target Platforms</label>
        <div className="flex flex-wrap gap-3">
          {allPlatforms.map(p => {
            const isConfigured = platforms.configured_platforms.includes(p);
            return (
              <label 
                key={p} 
                className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${!isConfigured ? 'opacity-50 grayscale cursor-not-allowed bg-ncpor-bg/30' : selectedPlatforms.includes(p) ? 'border-ncpor-accent bg-ncpor-accent/10 text-ncpor-accent' : 'border-ncpor-divider hover:border-ncpor-accent/50'}`}
                title={!isConfigured ? 'Credentials not configured' : ''}
              >
                <input 
                  type="checkbox" 
                  disabled={!isConfigured || !isApproved}
                  checked={selectedPlatforms.includes(p)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedPlatforms([...selectedPlatforms, p]);
                    else setSelectedPlatforms(selectedPlatforms.filter(pl => pl !== p));
                  }}
                  className="hidden"
                />
                <span className="capitalize text-sm font-medium">{p}</span>
              </label>
            );
          })}
        </div>
      </div>
      
      {selectedPlatforms.includes('twitter') && (
        <div className="mb-4 flex justify-end">
          <span className={`text-xs font-mono ${localText.length > 280 ? 'text-red-500 font-bold' : 'text-ncpor-secondary'}`}>
            X limit: {localText.length}/280
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center justify-between border-t border-ncpor-divider pt-4">
        <div className="flex items-center space-x-2">
          <input 
            type="datetime-local" 
            value={scheduleDate}
            onChange={e => setScheduleDate(e.target.value)}
            disabled={!isApproved}
            className="bg-ncpor-bg/50 border border-ncpor-divider text-ncpor-primary px-3 py-2 rounded focus:outline-none focus:border-ncpor-accent text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!isApproved || selectedPlatforms.length === 0}
            className="px-6 py-2 bg-ncpor-accent text-ncpor-bg font-bold uppercase tracking-wider text-sm rounded hover:bg-ncpor-accentBright disabled:opacity-50 transition-colors"
          >
            {scheduleDate ? 'Schedule' : 'Publish Now'}
          </button>
        </div>
      </div>

      {/* Result Chips */}
      {publishStatus.length > 0 && (
        <div className="mt-6 border-t border-ncpor-divider pt-4 space-y-2">
          <h4 className="text-sm font-semibold uppercase text-ncpor-secondary">Recent Activity</h4>
          {publishStatus.map(log => (
            <div key={log.id} className="flex justify-between items-center text-sm p-3 rounded-lg border border-ncpor-divider bg-ncpor-bg/30">
              <span className="capitalize font-medium text-ncpor-primary">{log.platform}</span>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-bold rounded-full border
                  ${log.status === 'success' ? 'bg-green-900/30 text-green-400 border-green-500/50' : 
                    log.status === 'failed' ? 'bg-red-900/30 text-red-400 border-red-500/50' : 
                    log.status === 'dry_run' ? 'bg-gray-800 text-gray-300 border-gray-600' :
                    'bg-blue-900/30 text-blue-400 border-blue-500/50'}`}
                >
                  {log.status.toUpperCase()}
                </span>
                {log.external_url && (
                  <a href={log.external_url} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:underline text-xs">Link ↗</a>
                )}
                {log.error_message && (
                  <span className="text-red-400 text-xs" title={log.error_message}>Error details</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-ncpor-primary mb-2">Confirm {scheduleDate ? 'Schedule' : 'Publish'}</h2>
            <p className="text-ncpor-secondary text-sm mb-4">
              You are about to {scheduleDate ? 'schedule' : 'publish'} this post to: <strong className="text-ncpor-accent capitalize">{selectedPlatforms.join(', ')}</strong>.
              {platforms.publish_mode === 'dry_run' ? (
                <span className="block mt-2 text-yellow-500 font-bold bg-yellow-900/20 p-2 rounded">Dry Run Mode: No real posts will be made.</span>
              ) : (
                <span className="block mt-2 text-red-500 font-bold bg-red-900/20 p-2 rounded">Live Mode: This action is irreversible.</span>
              )}
            </p>
            <div className="bg-ncpor-bg p-4 rounded-lg border border-ncpor-divider mb-6 max-h-60 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm text-ncpor-primary">{localText}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-ncpor-divider text-ncpor-secondary rounded hover:text-ncpor-primary transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handlePublish}
                disabled={loading}
                className="px-6 py-2 bg-ncpor-accent text-ncpor-bg rounded font-bold hover:bg-ncpor-accentBright transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishPanel;
