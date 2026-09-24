import apiClient from './client';

export function computeScore(employeeId) {
  return apiClient.post('/scoring/compute', { employeeId }).then((res) => res.data);
}

export function getEmployeeScore(employeeId) {
  return apiClient.get(`/scoring/employee/${employeeId}`).then((res) => res.data);
}
