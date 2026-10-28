import apiClient from './client';

// Platform administration (system_admin only).

export function listOrganizations() {
  return apiClient.get('/system/organizations').then((res) => res.data);
}

export function getOrganization(id) {
  return apiClient.get(`/system/organizations/${id}`).then((res) => res.data);
}

// Creates the organisation and emails its first admin a set-password link.
export function createOrganization(payload) {
  return apiClient.post('/system/organizations', payload).then((res) => res.data);
}

export function addOrganizationAdmin(id, payload) {
  return apiClient.post(`/system/organizations/${id}/admins`, payload).then((res) => res.data);
}

export function suspendOrganization(id) {
  return apiClient.post(`/system/organizations/${id}/suspend`).then((res) => res.data);
}

export function reactivateOrganization(id) {
  return apiClient.post(`/system/organizations/${id}/reactivate`).then((res) => res.data);
}

export function listAccessRequests(status) {
  return apiClient
    .get('/system/access-requests', { params: status ? { status } : undefined })
    .then((res) => res.data);
}

// Onboards the organisation from the request; `changes` overrides any field.
export function approveAccessRequest(id, changes) {
  return apiClient.post(`/system/access-requests/${id}/approve`, changes).then((res) => res.data);
}

export function declineAccessRequest(id, notify = true) {
  return apiClient.post(`/system/access-requests/${id}/decline`, { notify });
}

export function getPlatformAnalytics() {
  return apiClient.get('/system/analytics').then((res) => res.data);
}

export function listGlobalTemplates() {
  return apiClient.get('/system/templates').then((res) => res.data);
}

export function createGlobalTemplate(payload) {
  return apiClient.post('/system/templates', payload).then((res) => res.data);
}

export function updateGlobalTemplate(key, payload) {
  return apiClient.put(`/system/templates/${key}`, payload).then((res) => res.data);
}

export function deleteGlobalTemplate(key) {
  return apiClient.delete(`/system/templates/${key}`);
}
