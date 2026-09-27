import axios from 'axios';
import API_CONFIG from '../config/api';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Mock data for development
const mockContentItems = [
  {
    id: 1,
    title: 'Antarctic Ice Shelf Stability Assessment 2024',
    description: 'Comprehensive analysis of ice shelf dynamics in the Antarctic Peninsula region.',
    content_type: 'report',
    file_path: 'uploads/report/sample_report_1.pdf',
    expedition_name: 'ICE-2024',
    year: 2024,
    category: 'glaciology',
    tags: ['ice shelf', 'climate change', 'sea level'],
    uploaded_by: 1,
    uploaded_at: '2024-01-15T10:30:00',
    generated_posts: []
  },
  {
    id: 2,
    title: 'Southern Ocean Carbon Flux Measurements',
    description: 'Dataset containing continuous measurements of carbon dioxide flux across the air-sea interface.',
    content_type: 'dataset',
    file_path: 'uploads/dataset/carbon_flux_2023.csv',
    expedition_name: 'SO-CARBON-2023',
    year: 2023,
    category: 'ocean',
    tags: ['carbon cycle', 'Southern Ocean', 'climate'],
    uploaded_by: 2,
    uploaded_at: '2024-01-10T14:20:00',
    generated_posts: []
  },
  {
    id: 3,
    title: 'Arctic Atmospheric Aerosol Study',
    description: 'Publication analyzing seasonal variations in atmospheric aerosol concentrations.',
    content_type: 'publication',
    file_path: 'uploads/publication/arctic_aerosols.pdf',
    expedition_name: 'ARCTIC-AERO-2023',
    year: 2023,
    category: 'atmosphere',
    tags: ['aerosols', 'Arctic', 'atmosphere'],
    uploaded_by: 1,
    uploaded_at: '2024-01-05T09:15:00',
    generated_posts: []
  },
  {
    id: 4,
    title: 'Penguin Colony Mapping - Maritime Antarctic',
    description: 'Aerial photography survey of gentoo and chinstrap penguin colonies.',
    content_type: 'photo',
    file_path: 'uploads/photo/penguin_colony_2024.jpg',
    expedition_name: 'BIO-SURVEY-2024',
    year: 2024,
    category: 'biology',
    tags: ['penguins', 'wildlife', 'Antarctica'],
    uploaded_by: 2,
    uploaded_at: '2024-01-20T16:45:00',
    generated_posts: []
  },
  {
    id: 5,
    title: 'NCPOR Research Station Documentary',
    description: 'Video documentary showcasing daily life and research activities at Bharati Research Station.',
    content_type: 'video',
    file_path: 'uploads/video/bharati_station.mp4',
    expedition_name: 'DOC-2024',
    year: 2024,
    category: 'general',
    tags: ['Bharati Station', 'Antarctica', 'documentary'],
    uploaded_by: 1,
    uploaded_at: '2024-01-25T11:00:00',
    generated_posts: []
  }
];

const mockActivities = [
  {
    id: 1,
    title: 'Annual Polar Science Symposium',
    description: 'International conference bringing together polar researchers from around the world.',
    activity_date: '2024-03-15',
    related_content_ids: [1, 3]
  },
  {
    id: 2,
    title: 'Student Outreach Program',
    description: 'Educational workshop for school students about polar research and climate change.',
    activity_date: '2024-02-20',
    related_content_ids: [2, 4]
  }
];

// API functions with mock data fallback
export const contentAPI = {
  getAll: async (params = {}) => {
    if (USE_MOCK_DATA) {
      let filtered = [...mockContentItems];
      
      if (params.category) {
        filtered = filtered.filter(item => item.category === params.category);
      }
      if (params.year) {
        filtered = filtered.filter(item => item.year === parseInt(params.year));
      }
      if (params.content_type) {
        filtered = filtered.filter(item => item.content_type === params.content_type);
      }
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filtered = filtered.filter(item => 
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower)
        );
      }
      
      const page = params.page || 1;
      const pageSize = params.page_size || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      return { data: filtered.slice(start, end) };
    }
    return api.get(API_CONFIG.endpoints.content, { params });
  },
  
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      const item = mockContentItems.find(item => item.id === id);
      return { data: item || null };
    }
    return api.get(API_CONFIG.endpoints.contentById(id));
  },
  
  upload: async (formData) => {
    if (USE_MOCK_DATA) {
      return { data: { ...mockContentItems[0], id: Date.now() } };
    }
    return api.post(API_CONFIG.endpoints.content, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      return { data: { message: 'Deleted successfully' } };
    }
    return api.delete(API_CONFIG.endpoints.contentById(id));
  },
  
  getFile: async (id) => {
    if (USE_MOCK_DATA) {
      return { data: null };
    }
    return api.get(API_CONFIG.endpoints.contentFile(id), {
      responseType: 'blob'
    });
  },
  
  generatePosts: async (id) => {
    if (USE_MOCK_DATA) {
      return { 
        data: [
          { id: 1, content_item_id: id, platform: 'twitter', generated_text: 'Mock Twitter post about polar research #PolarScience', status: 'draft' },
          { id: 2, content_item_id: id, platform: 'instagram', generated_text: 'Mock Instagram post with emojis 🐧❄️ #Antarctica', status: 'draft' },
          { id: 3, content_item_id: id, platform: 'linkedin', generated_text: 'Mock LinkedIn professional post about NCPOR research achievements', status: 'draft' },
          { id: 4, content_item_id: id, platform: 'website', generated_text: 'Mock website blog post about recent polar discoveries', status: 'draft' }
        ]
      };
    }
    return api.post(API_CONFIG.endpoints.generatePosts(id));
  },
  
  updatePost: async (id, data) => {
    if (USE_MOCK_DATA) {
      return { data: { id, ...data } };
    }
    return api.patch(API_CONFIG.endpoints.updatePost(id), data);
  },
  
  updatePostStatus: async (id, status) => {
    if (USE_MOCK_DATA) {
      return { data: { id, status } };
    }
    return api.patch(API_CONFIG.endpoints.updatePostStatus(id), { status });
  }
};

export const activitiesAPI = {
  getAll: async () => {
    if (USE_MOCK_DATA) {
      return { data: mockActivities };
    }
    return api.get(API_CONFIG.endpoints.activities);
  },
  
  create: async (data) => {
    if (USE_MOCK_DATA) {
      return { data: { ...data, id: Date.now() } };
    }
    return api.post(API_CONFIG.endpoints.activities, data);
  }
};

export const authAPI = {
  login: async (email, password) => {
    if (USE_MOCK_DATA) {
      return { 
        data: {
          access_token: 'mock-token',
          token_type: 'bearer',
          user: { id: 1, name: 'Admin User', email, role: 'admin' }
        }
      };
    }
    return api.post(API_CONFIG.endpoints.login, new URLSearchParams({ 
      username: email, 
      password 
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  
  register: async (data) => {
    if (USE_MOCK_DATA) {
      return { data: { ...data, id: Date.now() } };
    }
    return api.post(API_CONFIG.endpoints.register, data);
  }
};

export default api;
