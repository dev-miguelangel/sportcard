declare const window: Window & { __API_URL__?: string; __APP_URL__?: string };

export const environment = {
  production: true,
  devAuthEnabled: false,
  // En producción se inyecta vía nginx/config.js, con fallback a /api
  get apiUrl() {
    return window.__API_URL__ || '/api';
  },
  get appUrl() {
    return window.__APP_URL__ || window.location.origin;
  },
};
