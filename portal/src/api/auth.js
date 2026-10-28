import apiClient from './client';

// Step one: check the password. Returns { mfaRequired, challengeId, email }.
export function beginLogin(email, password) {
  return apiClient.post('/auth/login', { email, password }).then((res) => res.data);
}

// Step two: exchange the emailed code for a token. Returns { token, user }.
export function verifyLoginOtp(challengeId, code) {
  return apiClient.post('/auth/login/verify', { challengeId, code }).then((res) => res.data);
}

// Resend a fresh code for the same challenge.
export function resendLoginOtp(challengeId) {
  return apiClient.post('/auth/login/resend', { challengeId }).then((res) => res.data);
}

// Optional sign-in methods the engine has configured, e.g. { googleClientId }.
export function getAuthProviders() {
  return apiClient.get('/auth/providers').then((res) => res.data);
}

// Google ID token in; same { mfaRequired, challengeId, email } as beginLogin.
export function googleLogin(credential) {
  return apiClient.post('/auth/google', { credential }).then((res) => res.data);
}

export function passkeyLoginOptions() {
  return apiClient.post('/auth/passkeys/login/options').then((res) => res.data);
}

// Returns { token, user }: a passkey is already two-factor, so no email code.
export function passkeyLoginVerify(challengeId, response) {
  return apiClient.post('/auth/passkeys/login/verify', { challengeId, response }).then((res) => res.data);
}

export function listPasskeys() {
  return apiClient.get('/auth/passkeys').then((res) => res.data);
}

export function passkeyRegisterOptions() {
  return apiClient.post('/auth/passkeys/register/options').then((res) => res.data);
}

export function passkeyRegisterVerify(challengeId, response, name) {
  return apiClient
    .post('/auth/passkeys/register/verify', { challengeId, response, name })
    .then((res) => res.data);
}

export function deletePasskey(id) {
  return apiClient.delete(`/auth/passkeys/${id}`);
}

export function requestPasswordReset(email) {
  return apiClient.post('/auth/password/forgot', { email }).then((res) => res.data);
}

export function resetPassword(token, password) {
  return apiClient.post('/auth/password/reset', { token, password });
}

// Self sign-up is closed; this only files a request for the RedFlag team.
export function requestAccess(payload) {
  return apiClient.post('/auth/access-requests', payload).then((res) => res.data);
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
