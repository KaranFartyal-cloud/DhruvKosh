import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contentAPI } from '../utils/api';

const Repository = () => {
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [contentType, setContentType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  
  const categories = ['', 'glaciology', 'ocean', 'atmosphere', 'biology', 'general'];
  const contentTypes = ['', 'report', 'photo', 'video', 'dataset', 'publication'];
  const years = ['', '2024', '2023', '2022', '2021', '2020'];
  
  const debouncedSearch = useState(search)[0];
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(debouncedSearch);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [debouncedSearch]);
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const params = {
          category: category || undefined,
          year: year || undefined,
          content_type: contentType || undefined,
          search: search || undefined,
          page,
          page_size: 20
        };
        
        const response = await contentAPI.getAll(params);
        setContentItems(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load content. Please try again.');
        console.error('Error fetching content:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [category, year, contentType, search, page]);
  
  const getThumbnail = (item) => {
    if (item.content_type === 'photo') {
      return (
        <div className="h-48 bg-ocean-100 flex items-center justify-center">
          <span className="text-ocean-600 text-4xl">📷</span>
        </div>
      );
    } else if (item.content_type === 'video') {
      return (
        <div className="h-48 bg-ocean-100 flex items-center justify-center">
          <span className="text-ocean-600 text-4xl">🎥</span>
        </div>
      );
    } else if (item.content_type === 'report' || item.content_type === 'publication') {
      return (
        <div className="h-48 bg-ocean-100 flex items-center justify-center">
          <span className="text-ocean-600 text-4xl">📄</span>
        </div>
      );
    } else {
      return (
        <div className="h-48 bg-ocean-100 flex items-center justify-center">
          <span className="text-ocean-600 text-4xl">📊</span>
        </div>
      );
    }
  };
  
  const getCategoryColor = (cat) => {
    const colors = {
      glaciology: 'bg-blue-100 text-blue-800',
      ocean: 'bg-cyan-100 text-cyan-800',
      atmosphere: 'bg-purple-100 text-purple-800',
      biology: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[cat] || colors.general;
  };
  
  const getContentTypeColor = (type) => {
    const colors = {
      report: 'bg-red-100 text-red-800',
      photo: 'bg-yellow-100 text-yellow-800',
      video: 'bg-pink-100 text-pink-800',
      dataset: 'bg-indigo-100 text-indigo-800',
      publication: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <h3 className="text-lg font-semibold text-ocean-900 mb-4">Filters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search content..."
                  className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'All'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
                >
                  {years.map(yr => (
                    <option key={yr} value={yr}>
                      {yr || 'All'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
                >
                  {contentTypes.map(type => (
                    <option key={type} value={type}>
                      {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'All'}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => {
                  setCategory('');
                  setYear('');
                  setContentType('');
                  setSearch('');
                }}
                className="w-full bg-ocean-600 text-white py-2 px-4 rounded-md hover:bg-ocean-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-ocean-900 mb-6">Content Repository</h1>
          
          {contentItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-ocean-400 text-6xl mb-4">📂</div>
              <h3 className="text-xl font-semibold text-ocean-900 mb-2">
                No content yet
              </h3>
              <p className="text-ocean-600 mb-4">
                Upload some content to get started
              </p>
              <Link
                to="/upload"
                className="inline-block bg-ocean-600 text-white py-2 px-6 rounded-md hover:bg-ocean-700 transition-colors"
              >
                Upload Content
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contentItems.map((item) => (
                  <Link
                    key={item.id}
                    to={`/content/${item.id}`}
                    className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {getThumbnail(item)}
                    <div className="p-4">
                      <h3 className="font-semibold text-ocean-900 mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(item.content_type)}`}>
                          {item.content_type}
                        </span>
                        {item.year && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item.year}
                          </span>
                        )}
                      </div>
                      {item.expedition_name && (
                        <p className="text-sm text-ocean-600">
                          {item.expedition_name}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="flex justify-center mt-8 space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:bg-ocean-300 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-ocean-100 text-ocean-900 rounded-md">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={contentItems.length < 20}
                  className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:bg-ocean-300 disabled:cursor-not-allowed"
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
