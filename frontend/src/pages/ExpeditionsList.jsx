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
    <div className="font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-display text-ncpor-textPrimary">Expeditions</h1>
        <button onClick={() => setShowModal(true)} className="bg-ncpor-accent text-ncpor-bg hover:bg-ncpor-lightIce px-5 py-2.5 rounded-lg font-medium flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(69,214,194,0.15)] hover:shadow-[0_0_20px_rgba(69,214,194,0.3)] hover:-translate-y-0.5 duration-200">
          <Plus className="h-5 w-5" />
          <span>New Expedition</span>
        </button>
      </div>

      <div className="bg-ncpor-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-ncpor-border overflow-hidden">
        <div className="p-5 border-b border-ncpor-border bg-ncpor-bgSecondary flex items-center">
          <div className="relative w-full md:w-80">
            <Search className="h-5 w-5 absolute left-3.5 top-2.5 text-ncpor-textMuted" />
            <input type="text" placeholder="Search expeditions..." className="pl-11 pr-4 py-2.5 w-full bg-ncpor-bg text-ncpor-textPrimary border border-ncpor-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all placeholder:text-ncpor-textMuted" />
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-ncpor-accent mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-ncpor-bgSecondary text-ncpor-textSecondary text-sm border-b border-ncpor-border">
                  <th className="p-5 font-semibold tracking-wide">Name</th>
                  <th className="p-5 font-semibold tracking-wide">Code</th>
                  <th className="p-5 font-semibold tracking-wide">Region</th>
                  <th className="p-5 font-semibold tracking-wide">Dates</th>
                  <th className="p-5 font-semibold tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ncpor-border/50">
                {expeditions?.map(exp => (
                  <tr key={exp.id} className="hover:bg-ncpor-bgSecondary/50 transition-colors group">
                    <td className="p-5">
                      <Link to={`/admin/expeditions/${exp.id}`} className="font-semibold font-display text-lg text-ncpor-textPrimary group-hover:text-ncpor-accent transition-colors">
                        {exp.name}
                      </Link>
                    </td>
                    <td className="p-5 text-ncpor-textSecondary font-mono text-sm">{exp.expedition_code}</td>
                    <td className="p-5 text-ncpor-textSecondary capitalize">{exp.region.replace('_', ' ')}</td>
                    <td className="p-5 text-ncpor-textSecondary">
                      {exp.start_date} {exp.end_date ? <span className="text-ncpor-textMuted mx-1">to</span> : ''} {exp.end_date}
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize tracking-wide border ${
                        exp.status === 'completed' ? 'bg-ncpor-success/10 text-ncpor-success border-ncpor-success/20' :
                        exp.status === 'ongoing' ? 'bg-ncpor-accent/10 text-ncpor-accent border-ncpor-accent/20' :
                        'bg-ncpor-warning/10 text-ncpor-warning border-ncpor-warning/20'
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ncpor-card border border-ncpor-border rounded-xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
            <h2 className="text-2xl font-bold font-display text-ncpor-textPrimary mb-6">Create New Expedition</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">Expedition Code</label>
                <input required type="text" name="expedition_code" value={formData.expedition_code} onChange={handleChange} className="w-full bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">Region</label>
                <select name="region" value={formData.region} onChange={handleChange} className="w-full bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all">
                  <option value="antarctic">Antarctic</option>
                  <option value="arctic">Arctic</option>
                  <option value="himalaya">Himalaya</option>
                  <option value="southern_ocean">Southern Ocean</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">Start Date</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ncpor-textSecondary mb-2">End Date</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full bg-ncpor-bgSecondary text-ncpor-textPrimary border border-ncpor-border rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-ncpor-accent focus:border-ncpor-accent transition-all [color-scheme:dark]" />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-ncpor-border/50">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-ncpor-textSecondary hover:text-ncpor-textPrimary font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={mutation.isPending} className="px-6 py-2.5 bg-ncpor-accent text-ncpor-bg hover:bg-ncpor-lightIce rounded-lg font-medium shadow-[0_0_15px_rgba(69,214,194,0.15)] transition-all">
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
