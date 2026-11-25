import apiClient from './client';

export function listReports() {
  return apiClient.get('/reports').then((res) => res.data);
}

export function submitReport(payload) {
  return apiClient.post('/reports', payload).then((res) => res.data);
}

// The dedicated forward-to reporting address (null when not configured).
export function getReportInfo() {
  return apiClient.get('/reports/info').then((res) => res.data);
}

// Admin triage: move a report to new | reviewed | resolved.
export function updateReportStatus(id, status) {
  return apiClient.patch(`/reports/${id}`, { status }).then((res) => res.data);
}
