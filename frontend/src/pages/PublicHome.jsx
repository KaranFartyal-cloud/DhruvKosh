import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { BookOpen, AlertCircle, RefreshCw } from 'lucide-react';

const PublicHome = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPublicContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/api/generated/public`);
      setContent(res.data);
    } catch (err) {
      setError('Failed to load published content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicContent();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex flex-col items-center max-w-lg mx-auto mt-10">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>{error}</p>
        <button onClick={fetchPublicContent} className="mt-3 flex items-center space-x-1 bg-white px-4 py-2 rounded shadow text-sm hover:bg-slate-50 transition-colors">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="text-center text-slate-500 py-20">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-2xl font-semibold text-slate-700 mb-2">No Content Available</h2>
        <p>Check back later for exciting updates from our polar expeditions.</p>
      </div>
    );
  }

  const getPreviewText = (item) => {
    try {
      if (item.content_category === 'social_post') return item.generated_text;
      
      let parsed;
      try {
        parsed = JSON.parse(item.generated_text);
      } catch (e) {
        return item.generated_text.substring(0, 150) + '...';
      }
      
      if (item.content_category === 'website_article') return parsed.body || '';
      if (item.content_category === 'educational_explainer' && parsed.explainer_text) return parsed.explainer_text;
      return item.generated_text.substring(0, 150) + '...';
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-ocean-900 mb-4">Discover Polar Science</h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">Read the latest articles and educational explainers from our recent expeditions to the Arctic, Antarctic, and Himalayas.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {content.map(item => (
          <Link key={item.id} to={`/content/${item.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-200 flex flex-col">
            <div className="h-48 bg-ice-100 flex items-center justify-center border-b border-slate-100">
               <BookOpen className="h-16 w-16 text-ocean-200" />
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <span className="inline-block px-3 py-1 bg-ocean-100 text-ocean-800 text-xs font-semibold rounded-full mb-3 w-max">
                {item.content_category === 'website_article' ? 'News Article' : 'Educational'}
              </span>
              <h2 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{item.generated_title || 'Untitled Content'}</h2>
              <p className="text-slate-600 mb-4 line-clamp-3 flex-grow">
                {getPreviewText(item)}
              </p>
              <div className="text-sm text-slate-500 mt-auto pt-4 border-t border-slate-100">
                Published: {new Date(item.published_at).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PublicHome;
