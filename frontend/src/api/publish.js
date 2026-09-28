import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com';

const publishAPI = {
  getPlatforms: () => axios.get(`${API_URL}/api/publish/platforms`),
  publishContent: (id, data) => axios.post(`${API_URL}/api/publish/${id}`, data),
  getPublishLog: (params) => axios.get(`${API_URL}/api/publish/log`, { params }),
  getPublishStatus: (id) => axios.get(`${API_URL}/api/publish/${id}/status`),
  cancelScheduled: (logId) => axios.delete(`${API_URL}/api/publish/schedule/${logId}`),
};

export default publishAPI;
