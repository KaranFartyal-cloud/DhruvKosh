import { useState, useEffect } from 'react';
import { activitiesAPI, contentAPI } from '../utils/api';

const Dashboard = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    totalContent: 0,
    byCategory: {},
    totalPosts: 0,
    pendingApproval: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    activity_date: ''
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch activities
        const activitiesResponse = await activitiesAPI.getAll();
        setActivities(activitiesResponse.data);
        
        // Fetch content for stats
        const contentResponse = await contentAPI.getAll();
        const contentItems = contentResponse.data;
        
        // Calculate stats
        const byCategory = {};
        contentItems.forEach(item => {
          byCategory[item.category] = (byCategory[item.category] || 0) + 1;
        });
        
        const totalPosts = contentItems.reduce((sum, item) => {
          return sum + (item.generated_posts?.length || 0);
        }, 0);
        
        const pendingApproval = contentItems.reduce((sum, item) => {
          return sum + (item.generated_posts?.filter(p => p.status === 'draft').length || 0);
        }, 0);
        
        setStats({
          totalContent: contentItems.length,
          byCategory,
          totalPosts,
          pendingApproval
        });
        
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await activitiesAPI.create(newActivity);
      // Refresh activities
      const response = await activitiesAPI.getAll();
      setActivities(response.data);
      setNewActivity({ title: '', description: '', activity_date: '' });
    } catch (err) {
      setError('Failed to add activity. Please try again.');
      console.error('Error adding activity:', err);
    }
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
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-7xl mx-auto mt-8">
        {error}
      </div>
    );
  }
  
  const maxCategoryCount = Math.max(...Object.values(stats.byCategory), 1);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-ocean-900 mb-6">Admin Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-ocean-600 mb-2">Total Content Items</div>
          <div className="text-3xl font-bold text-ocean-900">{stats.totalContent}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-ocean-600 mb-2">Total Posts Generated</div>
          <div className="text-3xl font-bold text-ocean-900">{stats.totalPosts}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-ocean-600 mb-2">Pending Approval</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.pendingApproval}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-ocean-600 mb-2">Total Activities</div>
          <div className="text-3xl font-bold text-ocean-900">{activities.length}</div>
        </div>
      </div>
      
      {/* Category Distribution Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-ocean-900 mb-4">Content by Category</h2>
        <div className="space-y-3">
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <div key={category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-ocean-700">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                <span className="text-ocean-900 font-medium">{count}</span>
              </div>
              <div className="w-full bg-ocean-100 rounded-full h-2">
                <div
                  className="bg-ocean-600 h-2 rounded-full transition-all"
                  style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Institutional Activities */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-ocean-900 mb-4">Institutional Activities</h2>
        
        {/* Add Activity Form */}
        <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-ocean-50 rounded-lg">
          <h3 className="font-semibold text-ocean-900 mb-3">Add New Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Activity Title"
              value={newActivity.title}
              onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
              required
              className="px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
            <input
              type="date"
              value={newActivity.activity_date}
              onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
              className="px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-ocean-600 text-white rounded-md hover:bg-ocean-700 transition-colors"
            >
              Add Activity
            </button>
          </div>
          <textarea
            placeholder="Activity Description"
            value={newActivity.description}
            onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
            rows={2}
            className="w-full mt-3 px-3 py-2 border border-ocean-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ocean-500"
          />
        </form>
        
        {/* Activities List */}
        {activities.length === 0 ? (
          <div className="text-center py-8 text-ocean-600">
            No activities yet
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border border-ocean-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-ocean-900">{activity.title}</h3>
                    {activity.activity_date && (
                      <p className="text-sm text-ocean-600 mt-1">
                        {new Date(activity.activity_date).toLocaleDateString()}
                      </p>
                    )}
                    {activity.description && (
                      <p className="text-ocean-700 mt-2">{activity.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
