import apiClient from './client';

export function listCampaigns() {
  return apiClient.get('/campaigns').then((res) => res.data);
}

export function getCampaign(id) {
  return apiClient.get(`/campaigns/${id}`).then((res) => res.data);
}

export function listTemplates() {
  return apiClient.get('/campaigns/templates').then((res) => res.data);
}

export function customizeTemplate(key, payload) {
  return apiClient.put(`/campaigns/templates/${key}`, payload).then((res) => res.data);
}

export function createCampaign(payload) {
  return apiClient.post('/campaigns', payload).then((res) => res.data);
}

// acknowledgeAuthorisation must be true; the server refuses the launch otherwise.
export function launchCampaign(id, { departmentId, acknowledgeAuthorisation } = {}) {
  return apiClient
    .post(`/campaigns/${id}/launch`, { departmentId, acknowledgeAuthorisation })
    .then((res) => res.data);
}

export function getCampaignResults(id) {
  return apiClient.get(`/campaigns/${id}/results`).then((res) => res.data);
}

export function createTemplate(payload) {
  return apiClient.post('/campaigns/templates', payload).then((res) => res.data);
}

export function resetTemplate(key) {
  return apiClient.delete(`/campaigns/templates/${key}`);
}

export function stopCampaign(id) {
  return apiClient.post(`/campaigns/${id}/stop`).then((res) => res.data);
}

export function deleteCampaign(id) {
  return apiClient.delete(`/campaigns/${id}`);
}
