// TODO: swap each export for a real API call once the endpoint exists.
// Nothing here is live data.

/**
 * @typedef {Object} DashboardEvent
 * @property {number} id
 * @property {string} text      e.g. "Jane K. reported SMS simulation"
 * @property {string} at        ISO timestamp
 * @property {number} impact    risk-score change in points; negative is good
 */

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

/** TODO: needs GET /analytics/events (recent simulation + training events). */
/** @type {DashboardEvent[]} */
export const recentEvents = [
  { id: 1, text: 'Jane K. reported SMS simulation', at: minutesAgo(18), impact: -3.2 },
  { id: 2, text: 'Peter M. clicked KRA phishing link', at: minutesAgo(95), impact: 6.5 },
  { id: 3, text: 'Amina O. completed M-Pesa training', at: minutesAgo(60 * 26), impact: -4.1 },
];

/** TODO: needs month-over-month training totals from GET /analytics/organization. */
export const trainingDeltaVsLastMonth = 12;

/**
 * Fallback template cards when the org has no templates loaded yet.
 * @type {{ name: string, type: 'sms' | 'email', category: string }[]}
 */
export const fallbackTemplates = [
  { name: 'Safaricom Care', type: 'sms', category: 'Telco support' },
  { name: 'KRA Notice', type: 'email', category: 'Tax compliance' },
  { name: 'M-Pesa Alert', type: 'sms', category: 'Mobile money' },
];

/** TODO: needs a notifications/messages endpoint. Drives the red dot on the chat button. */
export const unreadMessages = 2;
