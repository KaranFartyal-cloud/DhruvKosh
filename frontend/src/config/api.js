// Central API configuration — all endpoints sourced from web/main.py + web/routes/
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    // Health
    health: '/api/health',

    // Expeditions
    expeditions:       '/api/expeditions',
    expeditionById:    (id) => `/api/expeditions/${id}`,
    expeditionFull:    (id) => `/api/expeditions/${id}/full`,
    integrityCheck:    '/api/expeditions/integrity-check',

    // Reports (PDF) — mounted under /api/expeditions prefix
    uploadReport:      (expeditionId) => `/api/expeditions/${expeditionId}/reports`,
    reportById:        (id) => `/api/files/reports/${id}`,

    // Datasets
    datasets:          '/api/datasets',
    datasetById:       (id) => `/api/datasets/${id}`,
    datasetPreview:    (id) => `/api/datasets/${id}/preview`,
    datasetFile:       (id) => `/api/files/datasets/${id}`,

    // Publications
    publications:      '/api/publications',
    publicationById:   (id) => `/api/publications/${id}`,
    publicationFile:   (id) => `/api/files/publications/${id}`,

    // Media (photos/videos) — mounted under /api/expeditions prefix
    uploadMedia:       (expeditionId) => `/api/expeditions/${expeditionId}/media`,
    mediaFile:         (id) => `/api/files/media/${id}`,
    mediaThumbnail:    (id) => `/api/files/media/${id}/thumbnail`,

    // Institutional Activities
    activities:        '/api/activities',
    activityById:      (id) => `/api/activities/${id}`,

    // AI Content Generation
    generateContent:   (expeditionId) => `/api/generated/generate/${expeditionId}`,
    generateItemContent: (type, id) => `/api/generated/generate/item/${type}/${id}`,
    generatedByExpedition: (expeditionId) => `/api/generated/expedition/${expeditionId}/content`,
    generatedItemById: (id) => `/api/generated/generated-content/${id}`,
    updateGenerated:   (id) => `/api/generated/generated-content/${id}`,
    updateGeneratedStatus: (id) => `/api/generated/generated-content/${id}/status`,
    publicGenerated:   '/api/generated/public',

    // Auth
    login:    '/api/auth/login',
    register: '/api/auth/register',
  }
};

export default API_CONFIG;
