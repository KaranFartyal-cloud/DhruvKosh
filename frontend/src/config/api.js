const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    health: '/api/health',
    content: '/api/content',
    contentById: (id) => `/api/content/${id}`,
    contentFile: (id) => `/api/content/${id}/file`,
    generatePosts: (id) => `/api/content/${id}/generate`,
    updatePost: (id) => `/api/content/posts/${id}`,
    updatePostStatus: (id) => `/api/content/posts/${id}/status`,
    activities: '/api/activities',
    login: '/api/auth/login',
    register: '/api/auth/register',
  }
};

export default API_CONFIG;
