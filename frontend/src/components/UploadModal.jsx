import React, { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/expeditions';

const UploadModal = ({ isOpen, onClose, type, expeditionId }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({});
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const mutation = useMutation({
    mutationFn: async (submitData) => {
      if (type === 'report') return api.uploadReport({ expeditionId, formData: submitData.formData, onUploadProgress: submitData.onUploadProgress });
      if (type === 'dataset') return api.uploadDataset({ formData: submitData.formData, onUploadProgress: submitData.onUploadProgress });
      if (type === 'media') return api.uploadMedia({ expeditionId, formData: submitData.formData, onUploadProgress: submitData.onUploadProgress });
      if (type === 'publication') return api.uploadPublication({ formData: submitData.formData, onUploadProgress: submitData.onUploadProgress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expedition', expeditionId]);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    },
    onError: (err) => {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
    }
  });

  const resetForm = () => {
    setFile(null);
    setFormData({});
    setProgress(0);
    setError(null);
    mutation.reset();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setError(null);
    setProgress(0);
    
    const data = new FormData();
    data.append('file', file);
    
    // Append extra fields based on type
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    
    // Add default fields if needed
    if (type === 'dataset') data.append('expedition_id', expeditionId);

    mutation.mutate({
      formData: data,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 capitalize">Upload {type}</h2>
          <button onClick={() => { onClose(); resetForm(); }} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {mutation.isSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Successful!</h3>
              <p className="text-slate-500">The {type} has been added to the expedition.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-ocean-500 bg-ocean-50' : 'border-slate-300 hover:border-ocean-400 bg-slate-50'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => setFile(e.target.files[0])} 
                  className="hidden" 
                />
                <UploadCloud className={`h-12 w-12 mx-auto mb-3 ${file ? 'text-ocean-600' : 'text-slate-400'}`} />
                {file ? (
                  <div>
                    <p className="font-semibold text-ocean-800">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-700">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {type === 'report' || type === 'publication' ? 'PDF up to 50MB' : 
                       type === 'dataset' ? 'CSV or Excel up to 100MB' : 
                       'Images or Videos up to 500MB'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input type="text" required onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ocean-500" placeholder="Enter title..." />
                </div>
                
                {type === 'report' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                    <select required onChange={(e) => setFormData({...formData, report_type: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ocean-500">
                      <option value="">Select type...</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="final">Final</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                )}

                {type === 'dataset' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Data Type</label>
                      <select required onChange={(e) => setFormData({...formData, data_type: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ocean-500">
                        <option value="">Select type...</option>
                        <option value="meteorological">Meteorological</option>
                        <option value="oceanographic">Oceanographic</option>
                        <option value="glaciological">Glaciological</option>
                        <option value="biological">Biological</option>
                        <option value="geological">Geological</option>
                        <option value="atmospheric">Atmospheric</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">File Format</label>
                      <select required onChange={(e) => setFormData({...formData, file_format: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ocean-500">
                        <option value="">Select format...</option>
                        <option value="csv">CSV</option>
                        <option value="excel">Excel</option>
                        <option value="netcdf">NetCDF</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                  </>
                )}

                {type === 'media' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Media Type</label>
                    <select required onChange={(e) => setFormData({...formData, media_type: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ocean-500">
                      <option value="">Select type...</option>
                      <option value="photo">Photo</option>
                      <option value="video">Video</option>
                      <option value="documentary">Documentary</option>
                    </select>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start">
                  <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {mutation.isPending && (
                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
                  <div className="bg-ocean-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              )}

              <div className="flex justify-end pt-4 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => { onClose(); resetForm(); }} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                <button type="submit" disabled={mutation.isPending || !file} className="ml-3 px-6 py-2 bg-ocean-600 text-white rounded-lg font-medium hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {mutation.isPending ? `Uploading ${progress}%` : 'Upload'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
