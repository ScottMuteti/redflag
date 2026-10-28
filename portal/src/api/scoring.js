import apiClient from './client';

export function computeScore(employeeId) {
  return apiClient.post('/scoring/compute', { employeeId }).then((res) => res.data);
}

export function getEmployeeScore(employeeId) {
  return apiClient.get(`/scoring/employee/${employeeId}`).then((res) => res.data);
}

export function computeAllScores() {
  return apiClient.post('/scoring/compute-all').then((res) => res.data);
}

export function getScoreHistory(employeeId) {
  return apiClient.get(`/scoring/employee/${employeeId}/history`).then((res) => res.data);
}
