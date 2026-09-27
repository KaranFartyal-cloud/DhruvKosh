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
  
  const renderFilePreview = () => {
    if (!content) return null;
    
    const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/content/${content.id}/file`;
    
    switch (content.content_type) {
      case 'report':
      case 'publication':
        return (
          <div className="bg-white rounded-lg shadow p-4">
            <iframe
              src={fileUrl}
              className="w-full h-96 border border-ocean-200 rounded"
              title="PDF Preview"
            />
          </div>
        );
      case 'photo':
        return (
          <div className="bg-white rounded-lg shadow p-4">
            <img
              src={fileUrl}
              alt={content.title}
              className="w-full h-auto rounded"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#ddd" width="400" height="300"/><text fill="#666" font-family="Arial" font-size="20" x="50%" y="50%" text-anchor="middle">Image not available</text></svg>');
              }}
            />
          </div>
        );
      case 'video':
        return (
          <div className="bg-white rounded-lg shadow p-4">
            <video
              src={fileUrl}
              controls
              className="w-full rounded"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'dataset':
        return (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-ocean-900 mb-2">
              Dataset File
            </h3>
            <p className="text-ocean-600 mb-4">
              {content.file_path.split('/').pop()}
            </p>
            <a
              href={fileUrl}
              download
              className="inline-block bg-ocean-600 text-white py-2 px-6 rounded-md hover:bg-ocean-700 transition-colors"
            >
              Download Dataset
            </a>
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-ocean-900 mb-2">
              File Preview Not Available
            </h3>
            <a
              href={fileUrl}
              download
              className="inline-block bg-ocean-600 text-white py-2 px-6 rounded-md hover:bg-ocean-700 transition-colors"
            >
              Download File
            </a>
          </div>
        );
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800'
    };
    return colors[status] || colors.draft;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-7xl mx-auto mt-8">
        {error}
        <button
          onClick={() => navigate('/')}
          className="ml-4 text-red-700 underline"
        >
          Back to Repository
        </button>
      </div>
    );
  }
  
  if (!content) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded max-w-7xl mx-auto mt-8">
        Content not found
        <button
          onClick={() => navigate('/')}
          className="ml-4 text-yellow-700 underline"
        >
          Back to Repository
        </button>
      </div>
    );
  }
  
  const platforms = ['twitter', 'instagram', 'linkedin', 'website'];
  const postsByPlatform = {};
  content.generated_posts?.forEach(post => {
    postsByPlatform[post.platform] = post;
  });
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center text-ocean-600 hover:text-ocean-800 mb-6"
      >
        ← Back to Repository
      </Link>
      
      {/* Content Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-ocean-900 mb-2">
              {content.title}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-ocean-100 text-ocean-800">
                {content.category}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-ice-100 text-ice-800">
                {content.content_type}
              </span>
              {content.year && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {content.year}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-gradient-to-r from-ocean-600 to-ocean-700 text-white rounded-md hover:from-ocean-700 hover:to-ocean-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {generating ? 'Generating...' : 'Generate Social Media Content'}
          </button>
        </div>
        
        {content.description && (
          <p className="text-ocean-700 mb-4">{content.description}</p>
        )}
        
        {content.expedition_name && (
          <p className="text-sm text-ocean-600 mb-2">
            <strong>Expedition:</strong> {content.expedition_name}
          </p>
        )}
        
        {content.tags && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {content.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-ocean-50 text-ocean-600 rounded text-sm"
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-ocean-900 mb-6">
            Generated Social Media Posts
          </h2>
          
          {/* Platform Tabs */}
          <div className="flex border-b border-ocean-200 mb-6">
            {platforms.map(platform => (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === platform
                    ? 'text-ocean-600 border-b-2 border-ocean-600'
                    : 'text-ocean-400 hover:text-ocean-600'
                }`}
              >
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Active Platform Content */}
          {postsByPlatform[activeTab] && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-ocean-700 mb-2">
                  Generated Post ({activeTab})
                </label>
                <textarea
                  value={editingPosts[postsByPlatform[activeTab].id] || postsByPlatform[activeTab].generated_text}
                  onChange={(e) => handlePostEdit(postsByPlatform[activeTab].id, e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(postsByPlatform[activeTab].status)}`}>
                    {postsByPlatform[activeTab].status}
                  </span>
                  
                  {postsByPlatform[activeTab].status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(postsByPlatform[activeTab].id, 'approved')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  
                  {postsByPlatform[activeTab].status === 'approved' && (
                    <button
                      onClick={() => handleStatusChange(postsByPlatform[activeTab].id, 'published')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                </div>
                
                {editingPosts[postsByPlatform[activeTab].id] && (
                  <button
                    onClick={() => handlePostSave(postsByPlatform[activeTab].id)}
                    className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 transition-colors"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          )}
          
          {!postsByPlatform[activeTab] && (
            <div className="text-center py-8 text-ocean-600">
              No post generated for {activeTab} yet
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentDetail;
