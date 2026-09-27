import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import { Users, FileText, Database } from 'lucide-react';

const AdminDashboard = () => {
  const [expeditions, setExpeditions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpeditions = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/expeditions`);
        setExpeditions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExpeditions();
  }, []);

  const stats = [
    { name: 'Total Expeditions', value: expeditions.length, icon: Database, color: 'bg-ocean-500' },
    { name: 'Active Missions', value: expeditions.filter(e => e.status === 'ongoing').length, icon: Users, color: 'bg-teal-500' },
    { name: 'Planned Missions', value: expeditions.filter(e => e.status === 'planned').length, icon: FileText, color: 'bg-ice-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center">
            <div className={`p-4 rounded-lg ${stat.color} text-white mr-4`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.name}</p>
              <p className="text-3xl font-bold text-slate-800">{loading ? '-' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Recent Expeditions</h2>
          <Link to="/admin/expeditions" className="text-sm text-ocean-600 hover:text-ocean-800 font-medium">View All</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Loading...</div>
          ) : expeditions.slice(0, 5).map(exp => (
            <div key={exp.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div>
                <Link to={`/admin/expeditions/${exp.id}`} className="text-lg font-semibold text-ocean-700 hover:underline">{exp.name}</Link>
                <p className="text-sm text-slate-500">{exp.region} • {exp.expedition_code}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                exp.status === 'completed' ? 'bg-teal-100 text-teal-800' :
                exp.status === 'ongoing' ? 'bg-ocean-100 text-ocean-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {exp.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;
