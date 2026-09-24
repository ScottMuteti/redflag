import apiClient from './client';

export function login(email, password) {
  return apiClient.post('/auth/login', { email, password }).then((res) => res.data);
}

export function registerOrganization(payload) {
  return apiClient.post('/auth/register', payload).then((res) => res.data);
}
