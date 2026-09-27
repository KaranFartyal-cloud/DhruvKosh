import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import * as api from '../api/expeditions';

const ExpeditionsList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    expedition_code: '',
    region: 'antarctic',
    start_date: '',
    end_date: '',
    status: 'planned'
  });

  const { data: expeditions, isLoading } = useQuery({
    queryKey: ['expeditions'],
    queryFn: api.getExpeditions
  });

  const mutation = useMutation({
    mutationFn: api.createExpedition,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['expeditions']);
      setShowModal(false);
      navigate(`/admin/expeditions/${data.id}`);
    },
    onError: (err) => {
      console.error(err);
      alert('Failed to create expedition');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Expeditions</h1>
        <button onClick={() => setShowModal(true)} className="bg-ocean-600 hover:bg-ocean-700 text-white px-4 py-2 rounded-lg shadow flex items-center space-x-2 transition-colors">
          <Plus className="h-5 w-5" />
          <span>New Expedition</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center">
          <div className="relative w-64">
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Search expeditions..." className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500" />
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-ocean-600 mx-auto"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Code</th>
                <th className="p-4 font-semibold">Region</th>
                <th className="p-4 font-semibold">Dates</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expeditions?.map(exp => (
                <tr key={exp.id} className="hover:bg-ice-50 transition-colors">
                  <td className="p-4">
                    <Link to={`/admin/expeditions/${exp.id}`} className="font-semibold text-ocean-700 hover:underline">
                      {exp.name}
                    </Link>
                  </td>
                  <td className="p-4 text-slate-600">{exp.expedition_code}</td>
                  <td className="p-4 text-slate-600 capitalize">{exp.region.replace('_', ' ')}</td>
                  <td className="p-4 text-slate-600">
                    {exp.start_date} {exp.end_date ? `to ${exp.end_date}` : ''}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      exp.status === 'completed' ? 'bg-teal-100 text-teal-800' :
                      exp.status === 'ongoing' ? 'bg-ocean-100 text-ocean-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {exp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Expedition</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-ocean-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expedition Code</label>
                <input required type="text" name="expedition_code" value={formData.expedition_code} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-ocean-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                <select name="region" value={formData.region} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-ocean-500 outline-none">
                  <option value="antarctic">Antarctic</option>
                  <option value="arctic">Arctic</option>
                  <option value="himalaya">Himalaya</option>
                  <option value="southern_ocean">Southern Ocean</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-ocean-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-ocean-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium">Cancel</button>
                <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-ocean-600 text-white hover:bg-ocean-700 rounded-lg shadow font-medium">
                  {mutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExpeditionsList;
