import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// TODO: attach JWT bearer token via request interceptor

export default apiClient;
