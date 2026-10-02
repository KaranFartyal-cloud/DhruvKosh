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

  const expList = Array.isArray(expeditions) ? expeditions : (expeditions?.items || []);

  const mutation = useMutation({
    mutationFn: api.createExpedition,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['expeditions']);
      setShowModal(false);
      navigate(`/expeditions/${data.id}`);
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display text-ncpor-primary">Expeditions</h1>
        <button onClick={() => setShowModal(true)} className="bg-ncpor-accent hover:bg-ncpor-accent/90 text-ncpor-bg px-4 py-2 rounded-lg shadow font-bold flex items-center space-x-2 transition-colors">
          <Plus className="h-5 w-5" />
          <span>New Expedition</span>
        </button>
      </div>

      <div className="bg-ncpor-card rounded-xl shadow-premium border border-ncpor-border overflow-hidden">
        <div className="p-4 border-b border-ncpor-border bg-ncpor-bgSecondary flex items-center">
          <div className="relative w-64">
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-ncpor-textMuted" />
            <input type="text" placeholder="Search expeditions..." className="pl-10 pr-4 py-2 w-full bg-ncpor-bgSecondary border border-ncpor-border text-ncpor-textPrimary rounded-lg focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-ocean-600 mx-auto"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ncpor-bgSecondary text-ncpor-textSecondary text-sm border-b border-ncpor-border">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Code</th>
                <th className="p-4 font-semibold">Region</th>
                <th className="p-4 font-semibold">Dates</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ncpor-border">
              {expList?.map(exp => (
                <tr key={exp.id} className="hover:bg-ncpor-bgSecondary/50 transition-colors">
                  <td className="p-4">
                    <Link to={`/expeditions/${exp.id}`} className="font-semibold text-ncpor-accent hover:underline">
                      {exp.name}
                    </Link>
                  </td>
                  <td className="p-4 text-ncpor-textSecondary">{exp.expedition_code}</td>
                  <td className="p-4 text-ncpor-textSecondary capitalize">{exp.region.replace('_', ' ')}</td>
                  <td className="p-4 text-ncpor-textSecondary">
                    {exp.start_date} {exp.end_date ? `to ${exp.end_date}` : ''}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${exp.status === 'completed' ? 'bg-teal-100 text-teal-800' :
                        exp.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ncpor-card border border-ncpor-border rounded-xl shadow-premium max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-ncpor-primary mb-4">Create New Expedition</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ncpor-textSecondary mb-1">Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-ncpor-bgSecondary border border-ncpor-border text-ncpor-primary rounded p-2 focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ncpor-textSecondary mb-1">Expedition Code</label>
                <input required type="text" name="expedition_code" value={formData.expedition_code} onChange={handleChange} className="w-full bg-ncpor-bgSecondary border border-ncpor-border text-ncpor-primary rounded p-2 focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ncpor-textSecondary mb-1">Region</label>
                <select name="region" value={formData.region} onChange={handleChange} className="w-full bg-ncpor-bgSecondary border border-ncpor-border text-ncpor-primary rounded p-2 focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent">
                  <option value="antarctic">Antarctic</option>
                  <option value="arctic">Arctic</option>
                  <option value="himalaya">Himalaya</option>
                  <option value="southern_ocean">Southern Ocean</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ncpor-textSecondary mb-1">Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full bg-ncpor-bgSecondary border border-ncpor-border text-ncpor-primary rounded p-2 focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent" style={{colorScheme: 'dark'}} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ncpor-textSecondary mb-1">End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full bg-ncpor-bgSecondary border border-ncpor-border text-ncpor-primary rounded p-2 focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent" style={{colorScheme: 'dark'}} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-ncpor-textSecondary hover:bg-ncpor-bgSecondary rounded font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={mutation.isPending} className="px-6 py-2 bg-ncpor-accent text-ncpor-bg hover:bg-ncpor-accent/90 rounded-lg shadow font-bold transition-colors">
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
