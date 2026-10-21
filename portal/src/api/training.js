import apiClient from './client';

export function listAssignments() {
  return apiClient.get('/training/assignments').then((res) => res.data);
}

export function submitQuiz(assignmentId, answers) {
  return apiClient
    .post(`/training/assignments/${assignmentId}/complete`, { answers })
    .then((res) => res.data);
}

export function listModules() {
  return apiClient.get('/training/modules').then((res) => res.data);
}

export function createModule(payload) {
  return apiClient.post('/training/modules', payload).then((res) => res.data);
}

export function assignTraining(payload) {
  return apiClient.post('/training/assign', payload).then((res) => res.data);
}

export function updateModule(id, payload) {
  return apiClient.put(`/training/modules/${id}`, payload).then((res) => res.data);
}

export function deleteModule(id) {
  return apiClient.delete(`/training/modules/${id}`);
}

export function addStarterModules() {
  return apiClient.post('/training/modules/starter').then((res) => res.data);
}

export function saveLessonProgress(assignmentId, lessonProgress) {
  return apiClient
    .post(`/training/assignments/${assignmentId}/progress`, { lessonProgress })
    .then((res) => res.data);
}
