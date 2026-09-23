import apiClient from './client';

export function listEmployees(departmentId) {
  return apiClient.get('/employees', { params: departmentId ? { departmentId } : {} }).then((res) => res.data);
}

export function listDepartments() {
  return apiClient.get('/employees/departments').then((res) => res.data);
}

export function createEmployee(payload) {
  return apiClient.post('/employees', payload).then((res) => res.data);
}
