// Shared input validation. Server-side is the source of truth; the portal's
// checks are only for fast feedback.

// Deliberately simple and permissive-but-sane; the DB's UNIQUE still guards.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  return typeof value === 'string' && value.length <= 255 && EMAIL_RE.test(value.trim());
}

// Accepts Kenyan mobile formats and returns the normalised +2547…/+2541… form,
// or null if it isn't one: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, +2541XXXXXXXX,
// and the 2547…/2541… variants without the plus.
function normalizeKenyanPhone(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const raw = String(value).replace(/[\s-]/g, '');
  let local;
  if (/^0[17]\d{8}$/.test(raw)) local = raw.slice(1);
  else if (/^\+254[17]\d{8}$/.test(raw)) local = raw.slice(4);
  else if (/^254[17]\d{8}$/.test(raw)) local = raw.slice(3);
  else return { ok: false };
  return { ok: true, value: `+254${local}` };
}

module.exports = { isValidEmail, normalizeKenyanPhone };
