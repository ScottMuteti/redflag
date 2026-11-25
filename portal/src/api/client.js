import axios from 'axios';

// Base URL of the engine API, also used by the SSE live-event stream.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('redflag_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A rejected or expired session sends the user back to log in instead of leaving pages half-loaded.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/');
    // Ignore a late 401 from a session that a newer login has already replaced.
    const token = localStorage.getItem('redflag_token');
    const isCurrent = !token || error.config?.headers?.Authorization === `Bearer ${token}`;
    if (error.response?.status === 401 && !isAuthCall && isCurrent) {
      localStorage.removeItem('redflag_token');
      localStorage.removeItem('redflag_user');
      window.location.assign('/login?expired=1');
    }
    return Promise.reject(error);
  },
);

export default apiClient;
