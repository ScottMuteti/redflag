import apiClient from './client';

export function listCampaigns() {
  return apiClient.get('/campaigns').then((res) => res.data);
}

export function listTemplates() {
  return apiClient.get('/campaigns/templates').then((res) => res.data);
}

export function createCampaign(payload) {
  return apiClient.post('/campaigns', payload).then((res) => res.data);
}

export function launchCampaign(id, departmentId) {
  return apiClient.post(`/campaigns/${id}/launch`, departmentId ? { departmentId } : {}).then((res) => res.data);
}

export function getCampaignResults(id) {
  return apiClient.get(`/campaigns/${id}/results`).then((res) => res.data);
}
