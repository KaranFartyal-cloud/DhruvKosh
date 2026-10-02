import React, { useState, useEffect } from 'react';
import { authAPI, expeditionsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  Briefcase,
  FlaskConical,
  IdCard,
  Phone,
  Mail,
  Share2,
  Search,
  Filter
} from 'lucide-react';

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const [researchers, setResearchers] = useState([]);
  const [expeditions, setExpeditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'approved'
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resResearchers, resExpeditions] = await Promise.allSettled([
        authAPI.getResearchers(),
        expeditionsAPI.getAll()
      ]);

      if (resResearchers.status === 'fulfilled') {
        setResearchers(resResearchers.value.data || []);
      }
      if (resExpeditions.status === 'fulfilled') {
        setExpeditions(resExpeditions.value.data?.items || []);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id, name) => {
    setActionLoading(id);
    setMsg(null);
    try {
      await authAPI.approveResearcher(id);
      setMsg({ type: 'success', text: `Approved ${name}! They can now post content across social media platforms.` });
      await fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Approval failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id, name) => {
    setActionLoading(id);
    setMsg(null);
    try {
      await authAPI.rejectResearcher(id);
      setMsg({ type: 'info', text: `Revoked approval for ${name}.` });
      await fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Action failed.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Filter researchers
  const filteredResearchers = researchers.filter((r) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending'
        ? !r.is_approved
        : r.is_approved;

    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.institution?.toLowerCase().includes(q) ||
      r.research_area?.toLowerCase().includes(q) ||
      r.researcher_id?.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  const pendingCount = researchers.filter((r) => !r.is_approved).length;
  const approvedCount = researchers.filter((r) => r.is_approved).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ncpor-divider pb-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ncpor-primary flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
            Admin Control Center
          </h1>
          <p className="text-sm text-ncpor-muted mt-1">
            Review registered researchers, verify credentials, and approve social media publishing permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{pendingCount} Pending Approvals</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{approvedCount} Approved Researchers</span>
          </div>
        </div>
      </div>

      {/* Global Alert Notification */}
      {msg && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-3 animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : msg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Researcher Management Panel */}
      <div className="bg-ncpor-panel/80 backdrop-blur-md rounded-2xl border border-ncpor-divider overflow-hidden shadow-xl">
        <div className="p-6 border-b border-ncpor-divider flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ncpor-elevated/40">
          <div>
            <h2 className="text-lg font-bold text-ncpor-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-ncpor-accent" />
              Researcher Approvals &amp; Permissions
            </h2>
            <p className="text-xs text-ncpor-muted">
              Only approved researchers are granted authorization to post content across social media platforms.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-ncpor-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, ID, institution..."
                className="pl-9 pr-3 py-1.5 bg-ncpor-bg border border-ncpor-divider rounded-lg text-xs text-ncpor-primary focus:outline-none focus:border-ncpor-accent w-48 sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1 bg-ncpor-bg p-1 rounded-lg border border-ncpor-divider">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-ncpor-accent/20 text-ncpor-accent border border-ncpor-accent/30'
                    : 'text-ncpor-muted hover:text-ncpor-primary'
                }`}
              >
                All ({researchers.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-ncpor-muted hover:text-ncpor-primary'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filterStatus === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-ncpor-muted hover:text-ncpor-primary'
                }`}
              >
                Approved ({approvedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Researcher Cards Table */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center text-ncpor-muted flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-ncpor-accent/30 border-t-ncpor-accent rounded-full animate-spin" />
              <span>Loading registered researchers from database...</span>
            </div>
          ) : filteredResearchers.length === 0 ? (
            <div className="py-12 text-center text-ncpor-muted border border-dashed border-ncpor-divider rounded-xl">
              <Users className="w-10 h-10 text-ncpor-muted/50 mx-auto mb-2" />
              <p className="text-sm font-semibold text-ncpor-primary">No researchers found</p>
              <p className="text-xs">No researcher matches the selected filter status or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredResearchers.map((r) => (
                <div
                  key={r.id}
                  className={`p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    r.is_approved
                      ? 'bg-ncpor-elevated/40 border-emerald-500/20 hover:border-emerald-500/40'
                      : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 shadow-lg'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Status Badge & Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-base text-ncpor-primary flex items-center gap-2">
                          {r.name}
                          {r.is_approved ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Approved to Post
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-semibold flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" /> Pending Admin Approval
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-ncpor-accent font-medium flex items-center gap-1 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          {r.email}
                        </p>
                      </div>

                      <div className="px-2.5 py-1 rounded-lg bg-ncpor-panel border border-ncpor-divider text-[11px] font-mono text-ncpor-muted">
                        ID: {r.researcher_id || `RES-${r.id}`}
                      </div>
                    </div>

                    {/* All 9 Details Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-ncpor-divider/60">
                      <div className="flex items-center gap-1.5 text-ncpor-secondary">
                        <Building2 className="w-3.5 h-3.5 text-ncpor-muted" />
                        <span className="truncate">{r.institution || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-ncpor-secondary">
                        <Briefcase className="w-3.5 h-3.5 text-ncpor-muted" />
                        <span className="truncate">{r.designation || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-ncpor-secondary col-span-2">
                        <FlaskConical className="w-3.5 h-3.5 text-ncpor-accent" />
                        <span className="font-medium text-ncpor-primary truncate">{r.research_area || 'General Polar Science'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-ncpor-secondary">
                        <Phone className="w-3.5 h-3.5 text-ncpor-muted" />
                        <span>{r.phone_number || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-ncpor-secondary">
                        <Share2 className="w-3.5 h-3.5 text-ncpor-muted" />
                        <span>Social Posting: {r.is_approved ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-ncpor-divider/60 flex items-center justify-end gap-3">
                    {!r.is_approved ? (
                      <button
                        onClick={() => handleApprove(r.id, r.name)}
                        disabled={actionLoading === r.id}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-emerald-600/20 transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {actionLoading === r.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>Approve Researcher to Post</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReject(r.id, r.name)}
                        disabled={actionLoading === r.id}
                        className="py-1.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5"
                      >
                        {actionLoading === r.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Revoke Approval</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
