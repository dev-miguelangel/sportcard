declare const window: Window & { __API_URL__?: string };

export const environment = {
  production: true,
  devAuthEnabled: true,
  get apiUrl() {
    return window.__API_URL__ || '/api';
  },
};
