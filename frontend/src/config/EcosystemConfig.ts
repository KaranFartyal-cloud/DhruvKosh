// Stub: EcosystemConfig — not used in DhruvKosh, values are hardcoded via Vite env
export const API_ENDPOINTS = {
  chat: (import.meta as any).env?.VITE_API_BASE_URL
    ? `${(import.meta as any).env.VITE_API_BASE_URL}/api/generated/expedition/1/chat`
    : 'http://localhost:8000/api/generated/expedition/1/chat',
};

export const ECOSYSTEM_CONFIG = {
  apiBaseUrl: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000',
};
