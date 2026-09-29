import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
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
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('redflag_token');
      localStorage.removeItem('redflag_user');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export default apiClient;
