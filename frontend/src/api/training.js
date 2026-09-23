import apiClient from './client';

export function listAssignments() {
  return apiClient.get('/training/assignments').then((res) => res.data);
}

export function submitQuiz(assignmentId, answers) {
  return apiClient.post(`/training/assignments/${assignmentId}/complete`, { answers }).then((res) => res.data);
}

export function listModules() {
  return apiClient.get('/training/modules').then((res) => res.data);
}

export function createModule(payload) {
  return apiClient.post('/training/modules', payload).then((res) => res.data);
}
