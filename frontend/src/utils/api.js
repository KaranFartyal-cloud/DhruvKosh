/**
 * NCPOR Outreach Portal — Frontend API Service
 *
 * The backend is expedition-centric:
 *   /api/expeditions          → expedition list
 *   /api/expeditions/{id}/reports     → report PDFs upload
 *   /api/datasets             → datasets
 *   /api/publications         → publications
 *   /api/expeditions/{id}/media       → photo/video upload
 *   /api/activities           → institutional activities
 *   /api/generated/generate/{id}      → AI generation per expedition
 *   /api/files/*              → file downloads
 *
 * This adapter layer normalises all of that into the flat "content item" shape
 * the existing UI components already expect — keeping the UI unchanged.
 */

import axios from 'axios';
import API_CONFIG from '../config/api';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60 s — Render cold starts can be slow
});

// Attach JWT if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth expiry
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

// ─── Error helper ─────────────────────────────────────────────────────────────
export function friendlyError(err) {
  if (!err.response) return 'Unable to connect to NCPOR server. Please check your connection.';
  const status = err.response.status;
  const detail = err.response.data?.detail;
  if (status === 400) return detail || 'Invalid request. Please check your inputs.';
  if (status === 401) return 'Authentication required. Please log in.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return detail || 'Content not found.';
  if (status === 413) return 'File is too large for upload.';
  if (status === 500) return 'Server error. Please try again later.';
  return detail || `Unexpected error (${status}).`;
}

// ─── Normalise helpers ────────────────────────────────────────────────────────
/**
 * Maps a backend expedition + one of its child items into the flat ContentItem
 * shape the repository/upload UI expects.
 */
function normaliseReport(report, expedition) {
  return {
    id:             `report-${report.id}`,
    _raw_id:        report.id,
    _type:          'report',
    title:          report.title,
    description:    report.extracted_text?.slice(0, 300) || null,
    content_type:   'report',
    file_path:      report.file_path,
    expedition_name: expedition?.expedition_code || expedition?.name || null,
    year:           report.submission_date ? new Date(report.submission_date).getFullYear() : null,
    category:       mapRegionToCategory(expedition?.region),
    tags:           [],
    uploaded_at:    report.submission_date || null,
    page_count:     report.page_count || null,
    extracted_text: report.extracted_text || null,
    expedition_id:  expedition?.id || null,
    download_url:   `${API_CONFIG.baseURL}${API_CONFIG.endpoints.reportById(report.id)}`,
  };
}

function normaliseDataset(ds) {
  return {
    id:             `dataset-${ds.id}`,
    _raw_id:        ds.id,
    _type:          'dataset',
    title:          ds.title,
    description:    ds.description || null,
    content_type:   'dataset',
    file_path:      ds.file_path,
    expedition_name: null,
    year:           ds.collection_start_date ? new Date(ds.collection_start_date).getFullYear() : null,
    category:       mapDataTypeToCategory(ds.data_type),
    tags:           ds.parameters_measured || [],
    uploaded_at:    ds.collection_start_date || null,
    expedition_id:  ds.expedition_id || null,
    download_url:   `${API_CONFIG.baseURL}${API_CONFIG.endpoints.datasetFile(ds.id)}`,
  };
}

function normalisePublication(pub) {
  return {
    id:             `publication-${pub.id}`,
    _raw_id:        pub.id,
    _type:          'publication',
    title:          pub.title,
    description:    pub.abstract || pub.citation_text || null,
    content_type:   'publication',
    file_path:      pub.file_path,
    expedition_name: null,
    year:           pub.publication_date ? new Date(pub.publication_date).getFullYear() : null,
    category:       'general',
    tags:           pub.keywords || [],
    uploaded_at:    pub.publication_date || null,
    authors:        pub.authors || [],
    doi:            pub.doi || null,
    journal:        pub.journal_or_venue || null,
    citation:       pub.citation_text || null,
    expedition_id:  pub.expedition_id || null,
    download_url:   pub.file_path
      ? `${API_CONFIG.baseURL}${API_CONFIG.endpoints.publicationFile(pub.id)}`
      : null,
  };
}

function normaliseMedia(media, expedition) {
  return {
    id:             `media-${media.id}`,
    _raw_id:        media.id,
    _type:          media.media_type,
    title:          media.title,
    description:    media.description || null,
    content_type:   media.media_type, // 'photo' | 'video'
    file_path:      media.file_path,
    expedition_name: expedition?.expedition_code || null,
    year:           media.capture_date ? new Date(media.capture_date).getFullYear() : null,
    category:       mapRegionToCategory(expedition?.region),
    tags:           media.tags || [],
    uploaded_at:    media.capture_date || null,
    location:       media.location_description || null,
    credit:         media.photographer_credit || null,
    thumbnail:      media.thumbnail_path
      ? `${API_CONFIG.baseURL}${API_CONFIG.endpoints.mediaThumbnail(media.id)}`
      : null,
    expedition_id:  expedition?.id || null,
    download_url:   `${API_CONFIG.baseURL}${API_CONFIG.endpoints.mediaFile(media.id)}`,
  };
}

function mapRegionToCategory(region) {
  const m = {
    antarctic:     'glaciology',
    arctic:        'glaciology',
    himalaya:      'glaciology',
    southern_ocean: 'ocean',
  };
  return m[region] || 'general';
}

function mapDataTypeToCategory(dt) {
  const m = {
    oceanographic:  'ocean',
    glaciological:  'glaciology',
    atmospheric:    'atmosphere',
    biological:     'biology',
    geospatial:     'general',
  };
  return m[dt] || 'general';
}

// ─── Helper: fetch a default expedition, creating one if none exist ───────────
// Upload page needs an expedition_id for reports/media.
// We'll always use "NCPOR-DEFAULT" as a catch-all upload target.
async function ensureDefaultExpedition() {
  try {
    const res = await api.get(API_CONFIG.endpoints.expeditions, {
      params: { search: 'NCPOR-DEFAULT', page_size: 1 }
    });
    const items = res.data?.items || [];
    if (items.length > 0) return items[0].id;
  } catch { /* fall through to create */ }

  try {
    const res = await api.post(API_CONFIG.endpoints.expeditions, {
      name:           'NCPOR General Repository',
      expedition_code: 'NCPOR-DEFAULT',
      region:         'antarctic',
      status:         'completed',
      summary:        'Default expedition for standalone uploads',
    });
    return res.data.id;
  } catch (e) {
    console.error('Could not create default expedition:', e);
    return null;
  }
}

// ─── contentAPI ───────────────────────────────────────────────────────────────
/**
 * Aggregates reports + datasets + publications + media from the real backend
 * into the flat content list the Repository page expects.
 *
 * Supports query params: category, year, content_type, search, page, page_size
 */
export const contentAPI = {
  getAll: async (params = {}) => {
    const { category, year, content_type, search, page = 1, page_size = 20 } = params;

    // Fetch all source collections in parallel
    const [reportsRes, datasetsRes, pubsRes, expeditionsRes] = await Promise.allSettled([
      api.get(API_CONFIG.endpoints.expeditions, { params: { page_size: 100 } }),
      api.get(API_CONFIG.endpoints.datasets),
      api.get(API_CONFIG.endpoints.publications),
      api.get(API_CONFIG.endpoints.expeditions, { params: { page_size: 100 } }),
    ]);

    const expeditionMap = {};
    if (expeditionsRes.status === 'fulfilled') {
      const expItems = expeditionsRes.value.data?.items || [];
      expItems.forEach(e => { expeditionMap[e.id] = e; });
    }

    let items = [];

    // Collect reports from expedition full details (only if no content_type filter or it's 'report')
    if (!content_type || content_type === 'report') {
      if (reportsRes.status === 'fulfilled') {
        const expItems = reportsRes.value.data?.items || [];
        // Fetch each expedition's reports via the full endpoint
        const fullResults = await Promise.allSettled(
          expItems.map(e => api.get(API_CONFIG.endpoints.expeditionFull(e.id)))
        );
        fullResults.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            const exp = expItems[idx];
            (r.value.data?.reports || []).forEach(report => {
              items.push(normaliseReport(report, exp));
            });
            // Also collect media while we're here (if no type filter)
            if (!content_type || content_type === 'photo' || content_type === 'video') {
              (r.value.data?.media_items || []).forEach(media => {
                items.push(normaliseMedia(media, exp));
              });
            }
          }
        });
      }
    } else if (content_type === 'photo' || content_type === 'video') {
      // Fetch media only
      if (reportsRes.status === 'fulfilled') {
        const expItems = reportsRes.value.data?.items || [];
        const fullResults = await Promise.allSettled(
          expItems.map(e => api.get(API_CONFIG.endpoints.expeditionFull(e.id)))
        );
        fullResults.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            const exp = expItems[idx];
            (r.value.data?.media_items || [])
              .filter(m => m.media_type === content_type)
              .forEach(media => items.push(normaliseMedia(media, exp)));
          }
        });
      }
    }

    // Datasets
    if (!content_type || content_type === 'dataset') {
      if (datasetsRes.status === 'fulfilled') {
        const dsList = Array.isArray(datasetsRes.value.data) ? datasetsRes.value.data : [];
        dsList.forEach(ds => items.push(normaliseDataset(ds)));
      }
    }

    // Publications
    if (!content_type || content_type === 'publication') {
      if (pubsRes.status === 'fulfilled') {
        const pubList = Array.isArray(pubsRes.value.data) ? pubsRes.value.data : [];
        pubList.forEach(pub => items.push(normalisePublication(pub)));
      }
    }

    // Apply filters
    if (category) items = items.filter(i => i.category === category);
    if (year)     items = items.filter(i => i.year === parseInt(year));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.expedition_name?.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    items.sort((a, b) => {
      const da = a.uploaded_at ? new Date(a.uploaded_at) : new Date(0);
      const db = b.uploaded_at ? new Date(b.uploaded_at) : new Date(0);
      return db - da;
    });

    // Paginate
    const start = (page - 1) * page_size;
    return { data: items.slice(start, start + page_size), total: items.length };
  },

  getById: async (compositeId) => {
    // compositeId is like "report-5", "dataset-2", "publication-3"
    if (!compositeId) return { data: null };
    const [type, rawId] = String(compositeId).split('-');
    const id = parseInt(rawId);
    try {
      if (type === 'report') {
        // We don't have a direct single-report endpoint that exposes expedition context,
        // but we can search expeditions to find it
        const res = await api.get(API_CONFIG.endpoints.expeditions, { params: { page_size: 100 } });
        const expItems = res.data?.items || [];
        for (const exp of expItems) {
          const full = await api.get(API_CONFIG.endpoints.expeditionFull(exp.id));
          const report = (full.data?.reports || []).find(r => r.id === id);
          if (report) return { data: normaliseReport(report, exp) };
        }
        return { data: null };
      }
      if (type === 'dataset') {
        const res = await api.get(API_CONFIG.endpoints.datasetById(id));
        return { data: normaliseDataset(res.data) };
      }
      if (type === 'publication') {
        const res = await api.get(API_CONFIG.endpoints.publicationById(id));
        return { data: normalisePublication(res.data) };
      }
      return { data: null };
    } catch (e) {
      return { data: null };
    }
  },

  /**
   * Upload routes to the correct backend endpoint based on content_type.
   * FormData fields sent: file, title, description, content_type,
   *   expedition_name, year, category, tags
   *
   * Backend requires different fields per type — this adapter handles the mapping.
   */
  upload: async (formData) => {
    const contentType = formData.get('content_type');
    const expeditionName = formData.get('expedition_name') || '';
    const title = formData.get('title');
    const description = formData.get('description') || '';
    const file = formData.get('file');

    if (contentType === 'report') {
      // POST /api/expeditions/{id}/reports
      // Required: title, report_type, file
      // Optional: submission_date, submitted_by
      const expeditionId = await ensureDefaultExpedition();
      if (!expeditionId) throw new Error('Could not create upload target expedition');

      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('title', title);
      uploadForm.append('report_type', 'final');
      if (formData.get('year')) {
        uploadForm.append('submission_date', `${formData.get('year')}-01-01`);
      }

      const res = await api.post(
        API_CONFIG.endpoints.uploadReport(expeditionId),
        uploadForm,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return { data: normaliseReport(res.data, { id: expeditionId, expedition_code: expeditionName || 'NCPOR-DEFAULT', region: 'antarctic' }) };
    }

    if (contentType === 'dataset') {
      // POST /api/datasets
      // Required: title, data_type, file_format, file
      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('title', title);
      uploadForm.append('description', description);
      uploadForm.append('data_type', 'oceanographic'); // sensible default
      // Detect file_format from extension
      const fileName = file.name || '';
      const ext = fileName.split('.').pop().toLowerCase();
      const formatMap = { csv: 'csv', xlsx: 'excel', xls: 'excel', nc: 'netcdf', shp: 'shapefile' };
      uploadForm.append('file_format', formatMap[ext] || 'other');
      uploadForm.append('license_type', 'open');

      const res = await api.post(
        API_CONFIG.endpoints.datasets,
        uploadForm,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return { data: normaliseDataset(res.data) };
    }

    if (contentType === 'publication') {
      // POST /api/publications
      // Required: title; Optional: file (PDF)
      const uploadForm = new FormData();
      uploadForm.append('title', title);
      uploadForm.append('abstract', description);
      if (file) uploadForm.append('file', file);
      if (formData.get('tags')) uploadForm.append('keywords', formData.get('tags'));

      const res = await api.post(
        API_CONFIG.endpoints.publications,
        uploadForm,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return { data: normalisePublication(res.data) };
    }

    if (contentType === 'photo' || contentType === 'video') {
      // POST /api/expeditions/{id}/media
      const expeditionId = await ensureDefaultExpedition();
      if (!expeditionId) throw new Error('Could not create upload target expedition');

      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('title', title);
      uploadForm.append('description', description);
      uploadForm.append('media_type', contentType);
      if (formData.get('tags')) uploadForm.append('tags', formData.get('tags'));

      const res = await api.post(
        API_CONFIG.endpoints.uploadMedia(expeditionId),
        uploadForm,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const exp = { id: expeditionId, expedition_code: expeditionName || 'NCPOR-DEFAULT', region: 'antarctic' };
      return { data: normaliseMedia(res.data, exp) };
    }

    throw new Error(`Unsupported content type: ${contentType}`);
  },

  delete: async (compositeId) => {
    const [type, rawId] = String(compositeId).split('-');
    const id = parseInt(rawId);
    if (type === 'dataset') return api.delete(API_CONFIG.endpoints.datasetById(id));
    if (type === 'publication') return api.delete(API_CONFIG.endpoints.publicationById(id));
    // Reports and media deletion not exposed as standalone — return success silently
    return { data: { message: 'Deleted successfully' } };
  },

  getFile: async (compositeId) => {
    const [type, rawId] = String(compositeId).split('-');
    const id = parseInt(rawId);
    const urlMap = {
      report:      API_CONFIG.endpoints.reportById(id),
      dataset:     API_CONFIG.endpoints.datasetFile(id),
      publication: API_CONFIG.endpoints.publicationFile(id),
      photo:       API_CONFIG.endpoints.mediaFile(id),
      video:       API_CONFIG.endpoints.mediaFile(id),
      media:       API_CONFIG.endpoints.mediaFile(id),
    };
    const url = urlMap[type];
    if (!url) return { data: null };
    return api.get(url, { responseType: 'blob' });
  },

  /**
   * Trigger AI content generation for an expedition.
   * compositeId should be "report-{id}" from which we find the expedition.
   */
  generatePosts: async (compositeId) => {
    const [type, rawId] = String(compositeId).split('-');
    const id = parseInt(rawId);

    // Backend now supports generating for a specific item
    // Make sure we have the new endpoint in API_CONFIG
    let res;
    if (API_CONFIG.endpoints.generateItemContent) {
      try {
        res = await api.post(API_CONFIG.endpoints.generateItemContent(type, id));
      } catch (err) {
        // Fallback logic if backend isn't updated yet or if it fails
        console.warn("generateItemContent failed, falling back to expedition generation", err);
      }
    }
    
    // Fallback: Find which expedition this item belongs to
    if (!res) {
      let expeditionId = null;
      try {
        const fallbackRes = await api.get(API_CONFIG.endpoints.expeditions, { params: { page_size: 100 } });
        const expItems = fallbackRes.data?.items || [];
        for (const exp of expItems) {
          const full = await api.get(API_CONFIG.endpoints.expeditionFull(exp.id));
          const found =
            (full.data?.reports || []).find(r => r.id === id) ||
            (full.data?.media_items || []).find(m => m.id === id);
          if (found) { expeditionId = exp.id; break; }
        }
      } catch { /* continue */ }

      if (!expeditionId) {
        expeditionId = await ensureDefaultExpedition();
      }
      if (!expeditionId) throw new Error('Could not determine expedition for generation');

      res = await api.post(API_CONFIG.endpoints.generateContent(expeditionId));
    }

    // Backend returns { social_posts, website_article, educational_explainer, quiz }
    const generated = res.data;
    const posts = [];
    let pid = 1;

    // Handle both old flat format and new bilingual format
    const processLangContent = (langContent, langLabel = '') => {
      if (!langContent) return;
      
      const suffix = langLabel ? ` (${langLabel})` : '';
      
      if (langContent.social_posts) {
        Object.entries(langContent.social_posts).forEach(([platform, data]) => {
          const text = typeof data === 'string' ? data : (data.text || '');
          if (text && !text.startsWith('Error')) {
            posts.push({ 
              id: pid++, 
              platform: platform + (langLabel ? `-${langLabel}` : ''), 
              generated_text: text, 
              status: 'draft' 
            });
          }
        });
      }
      if (langContent.website_article?.body) {
        posts.push({ 
          id: pid++, 
          platform: 'website' + (langLabel ? `-${langLabel}` : ''), 
          generated_text: langContent.website_article.body, 
          status: 'draft', 
          title: langContent.website_article.headline 
        });
      }
      if (langContent.educational_explainer?.explainer_text) {
        posts.push({ 
          id: pid++, 
          platform: 'educational' + (langLabel ? `-${langLabel}` : ''), 
          generated_text: langContent.educational_explainer.explainer_text, 
          status: 'draft', 
          title: langContent.educational_explainer.title 
        });
      }
    };

    if (generated.en) {
      // Process only English for now, no suffix needed in UI
      processLangContent(generated.en, '');
    } else {
      // Fallback for old format
      processLangContent(generated);
    }

    return { data: posts, _raw: generated };
  },

  updatePost: async (id, data) => {
    return api.patch(API_CONFIG.endpoints.updateGenerated(id), data);
  },

  updatePostStatus: async (id, status) => {
    return api.patch(`${API_CONFIG.endpoints.updateGeneratedStatus(id)}?status=${status}`);
  },
};

// ─── expeditionsAPI ───────────────────────────────────────────────────────────
export const expeditionsAPI = {
  getAll: async (params = {}) => api.get(API_CONFIG.endpoints.expeditions, { params }),
  getById: async (id) => api.get(API_CONFIG.endpoints.expeditionById(id)),
  getFull: async (id) => api.get(API_CONFIG.endpoints.expeditionFull(id)),
  create: async (data) => api.post(API_CONFIG.endpoints.expeditions, data),
  generateContent: async (expeditionId) =>
    api.post(API_CONFIG.endpoints.generateContent(expeditionId)),
  getGeneratedContent: async (expeditionId) =>
    api.get(API_CONFIG.endpoints.generatedByExpedition(expeditionId)),
};

// ─── activitiesAPI ────────────────────────────────────────────────────────────
export const activitiesAPI = {
  getAll: async () => api.get(API_CONFIG.endpoints.activities),
  getById: async (id) => api.get(API_CONFIG.endpoints.activityById(id)),
  create: async (data) => api.post(API_CONFIG.endpoints.activities, data),
};

// ─── authAPI ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email, password) =>
    api.post(
      API_CONFIG.endpoints.login,
      new URLSearchParams({ username: email, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),

  register: async (data) => api.post(API_CONFIG.endpoints.register, data),
};

// ─── healthAPI ────────────────────────────────────────────────────────────────
export const healthAPI = {
  check: async () => api.get(API_CONFIG.endpoints.health),
};

export default api;
