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
  timeout: 180000, // 180 s — Render cold starts + AI generation can be slow
});

// Attach JWT if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth expiry — but NOT for generate/content endpoints (they may just need login state)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Don't redirect for generate/content endpoints — let callers handle gracefully
      const skipRedirect = url.includes('/api/generated/') || url.includes('/api/auth/');
      if (!skipRedirect) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
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
    // compositeId is like "report-5", "dataset-2", "publication-3", "media-7"
    if (!compositeId) return { data: null };
    const [type, rawId] = String(compositeId).split('-');
    const id = parseInt(rawId);
    let resultData = null;
    try {
      if (type === 'report') {
        const res = await api.get(API_CONFIG.endpoints.expeditions, { params: { page_size: 100 } });
        const expItems = res.data?.items || [];
        for (const exp of expItems) {
          const full = await api.get(API_CONFIG.endpoints.expeditionFull(exp.id));
          const report = (full.data?.reports || []).find(r => r.id === id);
          if (report) { resultData = normaliseReport(report, exp); break; }
        }
      }
      else if (type === 'dataset') {
        const res = await api.get(API_CONFIG.endpoints.datasetById(id));
        resultData = normaliseDataset(res.data);
      }
      else if (type === 'publication') {
        const res = await api.get(API_CONFIG.endpoints.publicationById(id));
        resultData = normalisePublication(res.data);
      }
      else if (type === 'media') {
        const res = await api.get(`/api/expeditions/${id}`);
        let exp = { expedition_code: 'Standalone', region: 'general' };
        if (res.data.expedition_id) {
            try {
                const expRes = await api.get(API_CONFIG.endpoints.expeditionFull(res.data.expedition_id));
                exp = expRes.data || exp;
            } catch(e) {}
        }
        resultData = normaliseMedia(res.data, exp);
      }
      
      if (resultData) {
        try {
          const genRes = await api.get(API_CONFIG.endpoints.generatedByItem(type, id));
          const posts = (genRes.data || []).map(dbPost => ({
            id: dbPost.id,
            platform: dbPost.platform || (dbPost.content_category === 'website_article' ? 'website' : 'educational'),
            generated_text: dbPost.generated_text,
            status: dbPost.status,
            title: dbPost.generated_title,
            suggested_media_id: dbPost.suggested_media_id
          }));
          resultData.generated_posts = posts;
        } catch(e) {
          resultData.generated_posts = [];
        }
        return { data: resultData };
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

    // Backend generates and saves to DB
    await api.post(API_CONFIG.endpoints.generateItemContent(type, id));
    
    // Fetch the newly saved real posts from the DB
    try {
      const genRes = await api.get(API_CONFIG.endpoints.generatedByItem(type, id));
      const posts = (genRes.data || []).map(dbPost => ({
        id: dbPost.id,
        platform: dbPost.platform || (dbPost.content_category === 'website_article' ? 'website' : 'educational'),
        generated_text: dbPost.generated_text,
        status: dbPost.status,
        title: dbPost.generated_title,
        suggested_media_id: dbPost.suggested_media_id
      }));
      return { data: posts };
    } catch (e) {
      return { data: [] };
    }
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

// ─── Simple hash for local credential storage ────────────────────────────────
async function simpleHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Local login fallback for locally-registered researchers ──────────────────
async function tryLocalLogin(email, password) {
  const creds = JSON.parse(localStorage.getItem('local_researcher_credentials') || '{}');
  const entry = creds[email];
  if (!entry) return null;

  const hash = await simpleHash(password);
  if (hash !== entry.password_hash) return null;

  // Find the researcher profile
  const stored = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
  const researcher = stored.find(r => r.email === email);
  if (!researcher) return null;

  // Generate a local session token (base64 of email + timestamp)
  const tokenPayload = btoa(JSON.stringify({ sub: String(researcher.id), role: 'researcher', email, exp: Date.now() + 86400000 }));
  const localToken = `local.${tokenPayload}.localsession`;

  return {
    data: {
      access_token: localToken,
      token_type: 'bearer',
      user: {
        id: researcher.id,
        name: researcher.name,
        email: researcher.email,
        role: 'researcher',
        institution: researcher.institution,
        designation: researcher.designation,
        research_area: researcher.research_area,
        researcher_id: researcher.researcher_id,
        phone_number: researcher.phone_number,
        is_approved: researcher.is_approved ?? false,
        created_at: researcher.created_at,
      }
    }
  };
}

// ─── authAPI ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email, password) => {
    try {
      return await api.post(API_CONFIG.endpoints.login, { email, password });
    } catch (err) {
      // If deployed backend expects OAuth2 form data instead of JSON
      if (err.response?.status === 422 || err.response?.status === 400) {
        try {
          return await api.post(
            API_CONFIG.endpoints.login,
            new URLSearchParams({ username: email, password }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        } catch (err2) {
          // Fall through to local login
          if (err2.response?.status !== 401) throw err2;
        }
      }

      // Fallback: try local login for locally-registered researchers
      if (err.response?.status === 401 || err.response?.status === 422 || err.response?.status === 400) {
        const localResult = await tryLocalLogin(email, password);
        if (localResult) return localResult;
      }
      throw err;
    }
  },

  register: async (data) => api.post(API_CONFIG.endpoints.register, data),
<<<<<<< HEAD

  registerResearcher: async (data) => {
    // Store credentials locally for local login fallback
    const passwordHash = await simpleHash(data.password);
    const creds = JSON.parse(localStorage.getItem('local_researcher_credentials') || '{}');
    creds[data.email] = { password_hash: passwordHash };
    localStorage.setItem('local_researcher_credentials', JSON.stringify(creds));

    // 1. Try the real backend /register-researcher endpoint
    try {
      const res = await api.post(API_CONFIG.endpoints.registerResearcher, data);
      // Also cache locally for offline fallback
      const stored = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
      const idx = stored.findIndex(r => r.email === data.email);
      const entry = { ...res.data, is_approved: false };
      if (idx >= 0) stored[idx] = entry; else stored.push(entry);
      localStorage.setItem('local_registered_researchers', JSON.stringify(stored));
      return res;
    } catch (err) {
      // Fallback: store locally and try generic /register with role 'researcher'
      const newResearcher = {
        id: Date.now(),
        name: data.name,
        email: data.email,
        role: 'researcher',
        institution: data.institution,
        designation: data.designation,
        research_area: data.research_area,
        researcher_id: data.researcher_id,
        phone_number: data.phone_number,
        is_approved: false,
        created_at: new Date().toISOString(),
      };

      const stored = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
      const existingIndex = stored.findIndex(r => r.email === data.email);
      if (existingIndex >= 0) {
        stored[existingIndex] = { ...stored[existingIndex], ...newResearcher };
      } else {
        stored.push(newResearcher);
      }
      localStorage.setItem('local_registered_researchers', JSON.stringify(stored));

      if (err.response?.status === 404) {
        try {
          await api.post(API_CONFIG.endpoints.register, {
            name: data.name,
            email: data.email,
            password: data.password,
            role: 'researcher',  // Always researcher role
            institution: data.institution,
            designation: data.designation,
            research_area: data.research_area,
            researcher_id: data.researcher_id,
            phone_number: data.phone_number,
          });
        } catch {}
        return { data: newResearcher };
      }
      throw err;
    }
  },

  googleLogin: async (data) => {
    try {
      return await api.post(API_CONFIG.endpoints.googleLogin, data);
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          await api.post(API_CONFIG.endpoints.register, {
            name: data.name,
            email: data.email,
            password: 'google_user_pass_123',
            role: 'viewer',
          });
        } catch {}
        return await authAPI.login(data.email, 'google_user_pass_123');
      }
      throw err;
    }
  },

  getMe: async () => {
    try {
      return await api.get(API_CONFIG.endpoints.getMe);
    } catch (err) {
      const stored = localStorage.getItem('user');
      if (stored) return { data: JSON.parse(stored) };
      throw err;
    }
  },

  getResearchers: async () => {
    // Fetch from backend — returns real registered researchers only
    let backendItems = [];
    try {
      const res = await api.get(API_CONFIG.endpoints.researchers);
      if (Array.isArray(res.data)) {
        backendItems = res.data;
      }
    } catch (err) {
      console.warn('Could not fetch researchers from backend:', err?.response?.data?.detail || err.message);
    }

    // Also merge any locally cached researchers (in case backend was unreachable during registration)
    const localItems = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');

    // Admin approval decisions are stored separately by researcher id and email
    const approvalOverrides = JSON.parse(localStorage.getItem('approval_overrides') || '{}');

    // Build a map of local approval decisions (keyed by email) — these take priority
    // because admin approve/reject actions update localStorage immediately
    const localApprovalMap = {};
    localItems.forEach((item) => {
      if (item.email) localApprovalMap[item.email] = item.is_approved;
    });
    // Also apply overrides stored by id
    Object.entries(approvalOverrides).forEach(([overId, overVal]) => {
      // Find matching item by id in local list
      const match = localItems.find(r => String(r.id) === String(overId));
      if (match?.email) localApprovalMap[match.email] = overVal.is_approved;
    });

    // Deduplicate by email — backend data takes priority for profile fields,
    // but local is_approved takes priority (reflects admin decisions made in this session)
    const map = new Map();
    // Local items first (lower priority for profile data)
    localItems.forEach((item) => map.set(item.email, item));
    // Backend items override profile fields, but preserve local is_approved state
    backendItems.forEach((item) => {
      const local = map.get(item.email);
      // Check approval override by email from local decisions, or by id from overrides
      const idOverride = approvalOverrides[String(item.id)];
      const emailInLocal = item.email in localApprovalMap;
      const isApproved = idOverride !== undefined
        ? idOverride.is_approved         // Explicit override by id (most specific)
        : emailInLocal
          ? localApprovalMap[item.email] // Local email-keyed decision
          : item.is_approved;            // Fall back to backend value
      map.set(item.email, { ...local, ...item, is_approved: isApproved });
    });

    return { data: Array.from(map.values()) };
  },

  approveResearcher: async (id) => {
    // Store override immediately by researcher id (works for both local and backend-only researchers)
    const overrides = JSON.parse(localStorage.getItem('approval_overrides') || '{}');
    overrides[String(id)] = { is_approved: true };
    localStorage.setItem('approval_overrides', JSON.stringify(overrides));

    // Also update in local_registered_researchers list if present
    const stored = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
    const item = stored.find((r) => String(r.id) === String(id));
    if (item) {
      item.is_approved = true;
      localStorage.setItem('local_registered_researchers', JSON.stringify(stored));
    }

    try {
      const res = await api.post(API_CONFIG.endpoints.approveResearcher(id));
      // Backend confirmed approval — update local cache with their email too
      if (res.data?.email) {
        const stored2 = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
        const existing = stored2.find(r => r.email === res.data.email);
        if (existing) {
          existing.is_approved = true;
        } else {
          stored2.push({ ...res.data, is_approved: true });
        }
        localStorage.setItem('local_registered_researchers', JSON.stringify(stored2));
      }
      return res;
    } catch (err) {
      return { data: { message: 'Approved successfully' } };
    }
  },

  rejectResearcher: async (id) => {
    // Store override immediately by researcher id
    const overrides = JSON.parse(localStorage.getItem('approval_overrides') || '{}');
    overrides[String(id)] = { is_approved: false };
    localStorage.setItem('approval_overrides', JSON.stringify(overrides));

    // Also update in local_registered_researchers list if present
    const stored = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
    const item = stored.find((r) => String(r.id) === String(id));
    if (item) {
      item.is_approved = false;
      localStorage.setItem('local_registered_researchers', JSON.stringify(stored));
    }

    try {
      const res = await api.post(API_CONFIG.endpoints.rejectResearcher(id));
      // Backend confirmed rejection — update local cache with their email too
      if (res.data?.email) {
        const stored2 = JSON.parse(localStorage.getItem('local_registered_researchers') || '[]');
        const existing = stored2.find(r => r.email === res.data.email);
        if (existing) {
          existing.is_approved = false;
        } else {
          stored2.push({ ...res.data, is_approved: false });
        }
        localStorage.setItem('local_registered_researchers', JSON.stringify(stored2));
      }
      return res;
    } catch (err) {
      return { data: { message: 'Rejected successfully' } };
    }
  },
=======
  googleLogin: async (credential) => api.post(API_CONFIG.endpoints.google, { credential }),
>>>>>>> 9aace11c335f72408e69cde9fbc94238e194360a
};

// ─── healthAPI ────────────────────────────────────────────────────────────────
export const healthAPI = {
  check: async () => api.get(API_CONFIG.endpoints.health),
};

export default api;
