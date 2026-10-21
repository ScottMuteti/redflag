import apiClient from './client';

export function getOrganizationAnalytics() {
  return apiClient.get('/analytics/organization').then((res) => res.data);
}

export function getEmployeeAnalytics(employeeId) {
  return apiClient.get(`/analytics/employee/${employeeId}`).then((res) => res.data);
}

export function getScoreRanges(period) {
  return apiClient.get('/analytics/score-ranges', { params: { period } }).then((res) => res.data);
}
