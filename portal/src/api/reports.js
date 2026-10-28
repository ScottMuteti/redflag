import apiClient from './client';

export function listReports() {
  return apiClient.get('/reports').then((res) => res.data);
}

export function submitReport(payload) {
  return apiClient.post('/reports', payload).then((res) => res.data);
}
