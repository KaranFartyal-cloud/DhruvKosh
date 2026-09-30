// Use the shared authenticated axios instance (includes JWT Bearer token automatically)
import api from '../utils/api';

const publishAPI = {
  getPlatforms: () => api.get('/api/publish/platforms'),
  publishContent: (id, data) => api.post(`/api/publish/${id}`, data),
  getPublishLog: (params) => api.get('/api/publish/log', { params }),
  getPublishStatus: (id) => api.get(`/api/publish/${id}/status`),
  cancelScheduled: (logId) => api.delete(`/api/publish/schedule/${logId}`),
};

export default publishAPI;
