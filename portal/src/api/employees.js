import apiClient from './client';

export function listEmployees(departmentId) {
  return apiClient
    .get('/employees', { params: departmentId ? { departmentId } : {} })
    .then((res) => res.data);
}

export function listDepartments() {
  return apiClient.get('/employees/departments').then((res) => res.data);
}

export function getEmployee(id) {
  return apiClient.get(`/employees/${id}`).then((res) => res.data);
}

export function createEmployee(payload) {
  return apiClient.post('/employees', payload).then((res) => res.data);
}

export function updateEmployee(id, payload) {
  return apiClient.put(`/employees/${id}`, payload).then((res) => res.data);
}

export function resetEmployeePassword(id, newPassword) {
  return apiClient.put(`/employees/${id}/password`, { newPassword });
}

export function deleteEmployee(id) {
  return apiClient.delete(`/employees/${id}`);
}
