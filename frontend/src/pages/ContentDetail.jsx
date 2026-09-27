import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { contentAPI } from '../utils/api';

const ContentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('twitter');
  const [editingPosts, setEditingPosts] = useState({});
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await contentAPI.getById(id);
        setContent(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load content. Please try again.');
        console.error('Error fetching content:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [id]);
  
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await contentAPI.generatePosts(id);
      setContent(prev => ({
        ...prev,
        generated_posts: response.data
      }));
    } catch (err) {
      setError('Failed to generate posts. Please try again.');
      console.error('Error generating posts:', err);
    } finally {
      setGenerating(false);
    }
  };
  
  const handlePostEdit = (postId, newText) => {
    setEditingPosts(prev => ({
      ...prev,
      [postId]: newText
    }));
  };
  
  const handlePostSave = async (postId) => {
    try {
      await contentAPI.updatePost(postId, {
        generated_text: editingPosts[postId]
      });
      // Refresh content
      const response = await contentAPI.getById(id);
      setContent(response.data);
      setEditingPosts(prev => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
    } catch (err) {
      setError('Failed to update post. Please try again.');
      console.error('Error updating post:', err);
    }
  };
  
  const handleStatusChange = async (postId, newStatus) => {
    try {
      await contentAPI.updatePostStatus(postId, newStatus);
      // Refresh content
      const response = await contentAPI.getById(id);
      setContent(response.data);
    } catch (err) {
      setError('Failed to update status. Please try again.');
      console.error('Error updating status:', err);
    }
  };
  
  useEffect(() => {
    if (!content?.generated_posts) return;
    const availablePlatforms = Array.from(new Set(content.generated_posts.map(p => p.platform)));
    if (availablePlatforms.length > 0 && !availablePlatforms.includes(activeTab)) {
      setActiveTab(availablePlatforms[0]);
    }
  }, [content?.generated_posts, activeTab]);

  const renderFilePreview = () => {
    if (!content) return null;
    
    // download_url is set by the API adapter per content type
    const fileUrl = content.download_url || `${import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com'}/api/files/${content._type}s/${content._raw_id}`;
    
    switch (content.content_type) {
      case 'report':
      case 'publication':
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-4 relative overflow-hidden group">
            <iframe
              src={fileUrl}
              className="w-full h-96 border border-ncpor-divider rounded-lg"
              title="PDF Preview"
            />
          </div>
        );
      case 'photo':
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-4 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1416] via-transparent to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none rounded-xl" />
            <img
              src={fileUrl}
              alt={content.title}
              className="w-full h-auto rounded-lg shadow-md"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#101E22" width="400" height="300"/><text fill="#7C949A" font-family="Arial" font-size="20" x="50%" y="50%" text-anchor="middle">Image not available</text></svg>');
              }}
            />
          </div>
        );
      case 'video':
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-4">
            <video
              src={fileUrl}
              controls
              className="w-full rounded-lg shadow-md"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'dataset':
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-12 text-center group hover:-translate-y-1 transition-all duration-300">
            <div className="text-ncpor-muted/30 text-6xl mb-6 transition-transform group-hover:scale-110 duration-500">📊</div>
            <h3 className="text-2xl font-display text-ncpor-primary mb-3">
              Dataset File
            </h3>
            <p className="text-ncpor-secondary mb-8 font-mono bg-ncpor-bg/50 inline-block px-4 py-2 rounded-lg border border-ncpor-divider">
              {content.file_path.split('/').pop()}
            </p>
            <br />
            <a
              href={fileUrl}
              download
              className="inline-flex items-center space-x-2 bg-ncpor-accent/10 border border-ncpor-accent/30 text-ncpor-accent py-3 px-8 rounded-lg hover:bg-ncpor-accent hover:text-ncpor-bg transition-all font-semibold uppercase tracking-wider text-sm"
            >
              <span>Download Dataset</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </a>
          </div>
        );
      default:
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-12 text-center group hover:-translate-y-1 transition-all duration-300">
            <div className="text-ncpor-muted/30 text-6xl mb-6 transition-transform group-hover:scale-110 duration-500">📄</div>
            <h3 className="text-2xl font-display text-ncpor-primary mb-3">
              File Preview Not Available
            </h3>
            <p className="text-ncpor-secondary mb-8">This file type cannot be previewed directly in the browser.</p>
            <a
              href={fileUrl}
              download
              className="inline-flex items-center space-x-2 bg-ncpor-sidebar border border-ncpor-divider text-ncpor-primary py-3 px-8 rounded-lg hover:border-ncpor-accent hover:text-ncpor-accent transition-all font-semibold uppercase tracking-wider text-sm"
            >
              <span>Download File</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </a>
          </div>
        );
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-ncpor-divider text-ncpor-secondary border border-ncpor-divider',
      approved: 'bg-ncpor-panel text-ncpor-primary border border-ncpor-divider',
      published: 'bg-ncpor-sidebar text-ncpor-primary border border-ncpor-accent/30'
    };
    return colors[status] || colors.draft;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ncpor-accent"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded max-w-7xl mx-auto mt-8 font-medium">
        {error}
        <button
          onClick={() => navigate('/')}
          className="ml-4 text-red-400 hover:text-red-300 underline"
        >
          Back to Repository
        </button>
      </div>
    );
  }
  
  if (!content) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded max-w-7xl mx-auto mt-8 font-medium">
        Content not found
        <button
          onClick={() => navigate('/')}
          className="ml-4 text-yellow-400 hover:text-yellow-300 underline"
        >
          Back to Repository
        </button>
      </div>
    );
  }
  
  const postsByPlatform = {};
  const platforms = [];
  content.generated_posts?.forEach(post => {
    postsByPlatform[post.platform] = post;
    if (!platforms.includes(post.platform)) {
      platforms.push(post.platform);
    }
  });
  if (platforms.length === 0) {
    platforms.push('twitter', 'instagram', 'linkedin', 'website');
  }
  
  const getCategoryColor = (cat) => {
    return 'bg-ncpor-divider text-ncpor-primary border border-ncpor-divider';
  };
  
  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center space-x-2 text-ncpor-secondary hover:text-ncpor-primary mb-8 transition-colors group"
      >
        <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
        <span className="font-medium tracking-wide uppercase text-sm">Back to Repository</span>
      </Link>
      
      {/* Content Details */}
      <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-8 mb-8 relative overflow-hidden">
        {/* Accent Top Border */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ncpor-accent via-ncpor-accentBright to-transparent opacity-50" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-display text-ncpor-primary mb-4 leading-tight">
              {content.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1.5 rounded bg-ncpor-bg border ${getCategoryColor(content.category).replace('bg-', 'border-').replace('/10', '/30')} text-xs font-semibold uppercase tracking-wider shadow-sm`}>
                {content.category}
              </span>
              <span className="px-3 py-1.5 rounded bg-ncpor-sidebar border border-ncpor-divider text-ncpor-secondary text-xs font-semibold uppercase tracking-wider shadow-sm">
                {content.content_type}
              </span>
              {content.year && (
                <span className="px-3 py-1.5 rounded bg-ncpor-sidebar border border-ncpor-divider text-ncpor-secondary text-xs font-semibold uppercase tracking-wider shadow-sm">
                  {content.year}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 px-8 py-3 bg-ncpor-accent text-ncpor-bg font-semibold uppercase tracking-wider text-sm rounded-lg hover:bg-ncpor-accentBright disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-ncpor-bg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span>Generate Content</span>
              </>
            )}
          </button>
        </div>
        
        {content.description && (
          <p className="text-ncpor-secondary text-lg leading-relaxed max-w-4xl mb-6">{content.description}</p>
        )}
        
        {content.expedition_name && (
          <div className="inline-flex items-center space-x-2 text-sm text-ncpor-secondary mb-4 bg-ncpor-bg/50 px-4 py-2 rounded-lg border border-ncpor-divider">
            <svg className="w-4 h-4 text-ncpor-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span><strong className="text-ncpor-primary font-medium">Expedition:</strong> {content.expedition_name}</span>
          </div>
        )}
        
        {content.tags && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {content.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-ncpor-bg/30 border border-ncpor-divider/50 text-ncpor-secondary rounded-full text-xs font-medium tracking-wide"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* File Preview */}
      <div className="mb-8">
        {renderFilePreview()}
      </div>
      
      {/* Generated Posts Section */}
      {content.generated_posts && content.generated_posts.length > 0 && (
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-8">
          <div className="flex items-center space-x-3 mb-8">
            <svg className="w-8 h-8 text-ncpor-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <h2 className="text-3xl font-display text-ncpor-primary">
              AI Generated Output
            </h2>
          </div>
          
          {/* Platform Tabs */}
          <div className="flex overflow-x-auto no-scrollbar border-b border-ncpor-divider mb-8">
            {platforms.map(platform => (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={`px-8 py-4 font-semibold uppercase tracking-wider text-sm transition-all whitespace-nowrap ${
                  activeTab === platform
                    ? 'text-ncpor-accent border-b-2 border-ncpor-accent bg-ncpor-accent/5'
                    : 'text-ncpor-secondary hover:text-ncpor-primary hover:bg-ncpor-bg/50'
                }`}
              >
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Active Platform Content */}
          {postsByPlatform[activeTab] && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold uppercase tracking-wider text-ncpor-secondary">
                    Review & Edit Content
                  </label>
                  <span className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider ${getStatusColor(postsByPlatform[activeTab].status)}`}>
                    {postsByPlatform[activeTab].status}
                  </span>
                </div>
                <div className="relative group">
                  <textarea
                    value={editingPosts[postsByPlatform[activeTab].id] || postsByPlatform[activeTab].generated_text}
                    onChange={(e) => handlePostEdit(postsByPlatform[activeTab].id, e.target.value)}
                    rows={8}
                    className="w-full bg-ncpor-bg/50 text-ncpor-primary px-6 py-5 border border-ncpor-divider rounded-xl focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent/30 transition-all resize-y text-lg leading-relaxed font-sans shadow-inner"
                  />
                  <div className="absolute top-4 right-4 text-ncpor-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-ncpor-bg/30 p-4 rounded-xl border border-ncpor-divider">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  {postsByPlatform[activeTab].status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(postsByPlatform[activeTab].id, 'approved')}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-ncpor-panel text-ncpor-primary border border-ncpor-divider font-semibold uppercase tracking-wider text-sm rounded-lg hover:border-ncpor-accent transition-all"
                    >
                      Approve
                    </button>
                  )}
                  
                  {postsByPlatform[activeTab].status === 'approved' && (
                    <button
                      onClick={() => handleStatusChange(postsByPlatform[activeTab].id, 'published')}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-ncpor-sidebar text-ncpor-primary border border-ncpor-divider font-semibold uppercase tracking-wider text-sm rounded-lg hover:border-ncpor-accent transition-all"
                    >
                      Publish
                    </button>
                  )}
                </div>
                
                {editingPosts[postsByPlatform[activeTab].id] && (
                  <button
                    onClick={() => handlePostSave(postsByPlatform[activeTab].id)}
                    className="w-full sm:w-auto px-8 py-2.5 bg-ncpor-accent text-ncpor-bg font-semibold uppercase tracking-wider text-sm rounded-lg hover:bg-ncpor-accentBright transition-all flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span>Save Changes</span>
                  </button>
                )}
              </div>
            </div>
          )}
          
          {!postsByPlatform[activeTab] && (
            <div className="text-center py-16 text-ncpor-secondary border border-dashed border-ncpor-divider rounded-xl bg-ncpor-bg/20">
              <div className="text-4xl mb-4 opacity-50">🤖</div>
              <p className="text-lg">No content generated for {platform.charAt(0).toUpperCase() + platform.slice(1)} yet.</p>
              <p className="text-sm mt-2 opacity-70">Click 'Generate Content' to create an AI draft.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentDetail;
