import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentAPI } from '../utils/api';

const Upload = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    file: null,
    title: '',
    description: '',
    content_type: 'report',
    expedition_name: '',
    year: '',
    category: 'general',
    tags: ''
  });
  
  const contentTypes = ['report', 'photo', 'video', 'dataset', 'publication'];
  const categories = ['glaciology', 'ocean', 'atmosphere', 'biology', 'general'];
  
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const data = new FormData();
      data.append('file', formData.file);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('content_type', formData.content_type);
      data.append('expedition_name', formData.expedition_name);
      data.append('year', formData.year);
      data.append('category', formData.category);
      data.append('tags', formData.tags);
      
      const response = await contentAPI.upload(data);
      setSuccess(true);
      
      // Redirect to content detail page after 2 seconds
      setTimeout(() => {
        navigate(`/content/${response.data.id}`);
      }, 2000);
      
    } catch (err) {
      setError('Failed to upload content. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const getFileTypeAccept = (contentType) => {
    const types = {
      report: 'application/pdf',
      photo: 'image/jpeg,image/png,image/gif',
      video: 'video/mp4,video/webm',
      dataset: '.csv,.json,.xlsx',
      publication: 'application/pdf'
    };
    return types[contentType] || '*/*';
  };
  
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-ocean-900 mb-6">Upload Content</h1>
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Content uploaded successfully! Redirecting...
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              File *
            </label>
            <input
              type="file"
              name="file"
              onChange={handleChange}
              accept={getFileTypeAccept(formData.content_type)}
              required
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
            <p className="text-sm text-ocean-600 mt-1">
              Accepted formats: {getFileTypeAccept(formData.content_type)}
            </p>
          </div>
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
              placeholder="Enter content title"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
              placeholder="Enter content description"
            />
          </div>
          
          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              Content Type *
            </label>
            <select
              name="content_type"
              value={formData.content_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              {contentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Expedition Name */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              Expedition Name
            </label>
            <input
              type="text"
              name="expedition_name"
              value={formData.expedition_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
              placeholder="e.g., ICE-2024"
            />
          </div>
          
          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              Year
            </label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              min="2000"
              max="2030"
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
              placeholder="e.g., 2024"
            />
          </div>
          
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
              placeholder="Comma-separated tags (e.g., climate, Antarctica, research)"
            />
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-ocean-300 text-ocean-700 rounded-md hover:bg-ocean-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 disabled:bg-ocean-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Uploading...' : 'Upload Content'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Upload;
