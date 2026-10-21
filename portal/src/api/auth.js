import apiClient from './client';

export function login(email, password) {
  return apiClient.post('/auth/login', { email, password }).then((res) => res.data);
}

export function registerOrganization(payload) {
  return apiClient.post('/auth/register', payload).then((res) => res.data);
}

export function getMe() {
  return apiClient.get('/auth/me').then((res) => res.data);
}

export function updateMe(payload) {
  return apiClient.put('/auth/me', payload).then((res) => res.data);
}

export function changePassword(currentPassword, newPassword) {
  return apiClient.put('/auth/password', { currentPassword, newPassword });
}

export function updateOrganization(payload) {
  return apiClient.put('/auth/organization', payload).then((res) => res.data);
}
