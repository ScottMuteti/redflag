// TODO: replace with API — nothing in this file is live data.

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

/**
 * Recent simulation / training events.
 * TODO: replace with API (needs GET /analytics/events).
 * outcome: 'reported' | 'clicked' | 'submitted' | 'completed'
 */
export const recentEvents = [
  {
    id: 1,
    name: 'Jane K.',
    text: 'reported SMS simulation',
    outcome: 'reported',
    at: minutesAgo(18),
  },
  {
    id: 2,
    name: 'Peter M.',
    text: 'clicked KRA phishing link',
    outcome: 'clicked',
    at: minutesAgo(95),
  },
  {
    id: 3,
    name: 'Amina O.',
    text: 'completed M-Pesa training',
    outcome: 'completed',
    at: minutesAgo(60 * 26),
  },
  {
    id: 4,
    name: 'Brian O.',
    text: 'submitted data on invoice email',
    outcome: 'submitted',
    at: minutesAgo(60 * 30),
  },
];

/**
 * Vulnerability score range (0–100) across employees per simulation wave.
 * TODO: replace with API (needs per-wave min/max from susceptibility_scores).
 */
export const vulnerabilityRanges = {
  daily: [
    { label: 'Mon', min: 22, max: 71 },
    { label: 'Tue', min: 25, max: 66 },
    { label: 'Wed', min: 19, max: 62 },
    { label: 'Thu', min: 24, max: 69 },
    { label: 'Fri', min: 18, max: 58 },
    { label: 'Sat', min: 21, max: 55 },
    { label: 'Sun', min: 16, max: 51 },
  ],
  weekly: [
    { label: 'Wave 1', min: 31, max: 84 },
    { label: 'Wave 2', min: 28, max: 79 },
    { label: 'Wave 3', min: 26, max: 81 },
    { label: 'Wave 4', min: 22, max: 72 },
    { label: 'Wave 5', min: 20, max: 66 },
    { label: 'Wave 6', min: 17, max: 61 },
  ],
  monthly: [
    { label: 'Jun', min: 34, max: 88 },
    { label: 'Jul', min: 29, max: 80 },
    { label: 'Aug', min: 24, max: 71 },
    { label: 'Sep', min: 18, max: 60 },
  ],
};

/** Score history for the employee drawer. TODO: replace with API (needs GET /scoring/employee/:id/history). */
export const scoreHistoryFor = (latest) => {
  if (latest === null || latest === undefined) return [];
  const drift = [14, 9, 11, 6, 4, 2, 0];
  return drift.map((d, i) => Math.max(1, Math.min(99, latest + d - (i % 2) * 3)));
};

/** Difficulty per template key. TODO: replace with API (templates have no difficulty column yet). */
export const templateDifficulty = {
  'mpesa-alert': 'medium',
  'kra-notice': 'hard',
  'safaricom-impersonation': 'easy',
  'invoice-fraud': 'hard',
};
