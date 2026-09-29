const numberFormat = new Intl.NumberFormat('en-KE');
const percentFormat = new Intl.NumberFormat('en-KE', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const deltaFormat = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const dateFormat = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const shortDateFormat = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' });
const dateTimeFormat = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const isBlank = (value) => value === null || value === undefined || Number.isNaN(value);

export const formatNumber = (value) => (isBlank(value) ? '—' : numberFormat.format(value));

// value is a 0–1 ratio.
export const formatPercent = (value) => (isBlank(value) ? '—' : percentFormat.format(value));

// value is already in points, e.g. -2.1 → "-2.1%".
export const formatDelta = (value) => `${deltaFormat.format(Math.abs(value) < 0.05 ? 0 : value)}%`;

const pointsFormat = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 1 });
// Unsigned magnitude in points, e.g. 2.14 → "2.1%" (direction is shown by an arrow).
export const formatPoints = (value) => `${pointsFormat.format(Math.abs(value))}%`;

// 0–1 score → whole number out of 100.
export const toScore = (value) => (isBlank(value) ? null : Math.round(value * 100));

export const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : '—');
export const formatShortDate = (value) => (value ? shortDateFormat.format(new Date(value)) : '—');
export const formatDateTime = (value) => (value ? dateTimeFormat.format(new Date(value)) : '—');

export function relativeTime(date, now = new Date()) {
  if (!date) return '—';
  const minutes = Math.round((now - new Date(date)) / 60000);
  if (minutes < 0) return `in ${formatShortDate(date)}`;
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return formatShortDate(date);
}

export function tenure(hireDate, now = new Date()) {
  if (!hireDate) return '—';
  const months = Math.max(
    0,
    (now.getFullYear() - new Date(hireDate).getFullYear()) * 12 +
      now.getMonth() -
      new Date(hireDate).getMonth(),
  );
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} yr ${rest} mo` : `${years} yr`;
}

export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const firstNameOf = (name = '') => name.split(' ')[0] || '';

export const riskLevelOf = (score) => {
  if (isBlank(score)) return null;
  if (score < 0.33) return 'low';
  if (score < 0.66) return 'medium';
  return 'high';
};
