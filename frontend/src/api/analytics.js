import apiClient from './client';

export function getOrganizationAnalytics() {
  return apiClient.get('/analytics/organization').then((res) => res.data);
}
