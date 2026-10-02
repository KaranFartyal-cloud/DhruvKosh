import { useState, useRef, memo } from 'react';
import { activitiesAPI } from '../utils/api';
import { useCountUp, useInView } from '../hooks/useAnimation';
import { useLiveStats, useInvalidateLiveStats } from '../hooks/useLiveStats';
import LiveIndicator from '../components/LiveIndicator';

/* ── Animated KPI card ──────────────────────────────────────────────────── */
const KpiCard = memo(({ label, value, icon, delay = 0 }) => {
  const count = useCountUp(value, 750);
  return (
    <div
      className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6
        relative overflow-hidden group sweep-hover
        hover:-translate-y-[3px] hover:border-ncpor-accent/30
        transition-all duration-220 ease-out animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Ghost icon */}
      <div className="absolute -right-4 -top-4 text-ncpor-accent/[0.04] transition-transform duration-500 group-hover:scale-110">
        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
          <path d={icon} />
        </svg>
      </div>
      <div className="text-xs font-semibold uppercase tracking-wider text-ncpor-secondary mb-3">{label}</div>
      <div className="text-5xl font-display text-ncpor-primary tabular-nums">{count}</div>
    </div>
  );
});

/* ── Animated category bar ──────────────────────────────────────────────── */
const CategoryBar = memo(({ category, count, maxCount, delay = 0 }) => {
  const [ref, inView] = useInView();
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

  const barColors = {
    glaciology: 'bg-ncpor-accent',
    ocean:      'bg-ncpor-accentSoft',
    atmosphere: 'bg-ncpor-muted',
    biology:    'bg-ncpor-divider',
  };
  const bar = barColors[category] || 'bg-ncpor-divider';

  return (
    <div ref={ref} className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ncpor-secondary capitalize">{category}</span>
        <span className="text-xl font-display text-ncpor-primary leading-none">{count}</span>
      </div>
      <div className="w-full bg-ncpor-bg rounded-full h-1.5 border border-ncpor-divider overflow-hidden">
        <div
          className={`${bar} h-full rounded-full transition-all ease-out`}
          style={{
            width: inView ? `${pct}%` : '0%',
            transitionDuration: '900ms',
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
});

/* ── Activity item ──────────────────────────────────────────────────────── */
const ActivityItem = memo(({ activity, index }) => (
  <div
    className="bg-ncpor-bg/30 border border-ncpor-divider rounded-xl p-5
      hover:-translate-y-[2px] hover:border-ncpor-accent/30
      transition-all duration-220 ease-out animate-fade-up"
    style={{ animationDelay: `${300 + (index < 8 ? index * 60 : 0)}ms` }}
  >
    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
      <div>
        <h3 className="text-base font-medium text-ncpor-primary">{activity.title}</h3>
        {activity.description && (
          <p className="text-ncpor-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">{activity.description}</p>
        )}
      </div>
      {activity.activity_date && (
        <span className="shrink-0 inline-block px-3 py-1 bg-ncpor-sidebar border border-ncpor-divider rounded text-xs font-semibold uppercase tracking-wider text-ncpor-accent">
          {new Date(activity.activity_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  </div>
));

/* ── Dashboard ──────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const { data: liveData, isLoading, isError, dataUpdatedAt } = useLiveStats();
  const invalidateLiveStats = useInvalidateLiveStats();

  const [newActivity, setNewActivity] = useState({ title: '', description: '', activity_date: '', activity_type: 'outreach_event' });
  const [formShake, setFormShake] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const activities = liveData?.activities || [];
  const byCategory = liveData?.byCategory || {};
  const totalContent = liveData?.documents ?? 0;
  const totalPosts = liveData?.totalPosts ?? 0;
  const pendingApproval = liveData?.pendingApproval ?? 0;

  const handleAddActivity = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      await activitiesAPI.create(newActivity);
      await invalidateLiveStats();
      setNewActivity({ title: '', description: '', activity_date: '', activity_type: 'outreach_event' });
    } catch (err) {
      setSubmitError('Failed to add activity. Please try again.');
      setFormShake(true);
      setTimeout(() => setFormShake(false), 400);
      console.error('Error adding activity:', err);
    }
  };

  if (isLoading && !liveData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ncpor-accent" />
      </div>
    );
  }

  if (isError && !liveData) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded max-w-7xl mx-auto mt-8 font-medium animate-shake">
        Failed to load dashboard data. Please check your connection.
      </div>
    );
  }

  const maxCategoryCount = Math.max(...Object.values(byCategory), 1);

  const KPI_ICONS = {
    totalContent:    'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z',
    totalPosts:      'M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z',
    pendingApproval: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z',
    activities:      'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z',
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display text-ncpor-primary mb-1 tracking-tight animate-fade-up" style={{ animationDelay: '0ms' }}>
            Dashboard
          </h1>
          <p className="text-ncpor-secondary text-base animate-fade-up" style={{ animationDelay: '60ms' }}>
            Platform statistics and institutional activities overview.
          </p>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <LiveIndicator dataUpdatedAt={dataUpdatedAt} isError={isError} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard label="Total Content"    value={totalContent}    icon={KPI_ICONS.totalContent}    delay={80}  />
        <KpiCard label="Posts Generated"  value={totalPosts}      icon={KPI_ICONS.totalPosts}      delay={140} />
        <KpiCard label="Pending Approval" value={pendingApproval} icon={KPI_ICONS.pendingApproval} delay={200} />
        <KpiCard label="Total Activities" value={activities.length}     icon={KPI_ICONS.activities}      delay={260} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Category chart */}
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-7 lg:col-span-1 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-lg font-display text-ncpor-primary mb-7 tracking-tight">Content by Category</h2>
          <div className="space-y-5">
            {Object.entries(byCategory).map(([category, count], i) => (
              <CategoryBar key={category} category={category} count={count} maxCount={maxCategoryCount} delay={i * 80} />
            ))}
          </div>
        </div>

        {/* Activities */}
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-7 lg:col-span-2 animate-fade-up" style={{ animationDelay: '260ms' }}>
          <h2 className="text-lg font-display text-ncpor-primary mb-6 tracking-tight">Institutional Activities</h2>

          {/* Add Activity Form */}
          <form
            onSubmit={handleAddActivity}
            className={`mb-7 p-5 bg-ncpor-bg/50 border border-ncpor-divider rounded-xl ${formShake ? 'animate-shake' : ''}`}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ncpor-secondary mb-4">Add New Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Activity Title"
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                required
                className="md:col-span-2 px-4 py-2.5 bg-ncpor-panel text-ncpor-primary border border-ncpor-divider rounded-lg
                  focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15
                  transition-all duration-220 placeholder:text-ncpor-muted/50 text-sm"
              />
              <select
                value={newActivity.activity_type}
                onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value })}
                required
                className="px-4 py-2.5 bg-ncpor-panel text-ncpor-primary border border-ncpor-divider rounded-lg
                  focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15
                  transition-all duration-220 text-sm"
              >
                <option value="outreach_event">Outreach Event</option>
                <option value="workshop">Workshop</option>
                <option value="conference">Conference</option>
                <option value="expedition_launch">Expedition Launch</option>
                <option value="school_program">School Program</option>
                <option value="press_release">Press Release</option>
                <option value="award">Award</option>
              </select>
              <input
                type="date"
                value={newActivity.activity_date}
                onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
                className="px-4 py-2.5 bg-ncpor-panel text-ncpor-primary border border-ncpor-divider rounded-lg
                  focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15
                  transition-all duration-220 text-sm"
              />
            </div>
            <div className="flex gap-3 mt-3">
              <textarea
                placeholder="Activity Description (optional)"
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                rows={2}
                className="flex-1 px-4 py-3 bg-ncpor-panel text-ncpor-primary border border-ncpor-divider rounded-lg
                  focus:outline-none focus:border-ncpor-accent focus:ring-2 focus:ring-ncpor-accent/15
                  transition-all duration-220 placeholder:text-ncpor-muted/50 resize-none text-sm"
              />
              <button
                type="submit"
                className="self-end px-6 py-2.5 bg-ncpor-accent text-ncpor-bg font-semibold rounded-lg
                  hover:bg-ncpor-accentBright active:scale-[0.98]
                  transition-all duration-150 ease-out text-sm whitespace-nowrap"
              >
                Add Activity
              </button>
            </div>
          </form>

          {/* Activities list */}
          {activities.length === 0 ? (
            <div className="text-center py-10 text-ncpor-muted border border-dashed border-ncpor-divider rounded-xl text-sm">
              No activities recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, i) => (
                <ActivityItem key={activity.id} activity={activity} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
