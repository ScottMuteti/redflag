// Derivations over the /analytics/organization and /campaigns payloads.

export const rate = (part, whole) => (whole > 0 ? part / whole : null);

// Difference between the last two values, in points (values already 0–100).
export const lastDelta = (series) =>
  series.length >= 2 ? series[series.length - 1] - series[series.length - 2] : null;

export const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export const inRange = (date, range, now = Date.now()) =>
  range === 'all' || now - new Date(date).getTime() <= Number(range) * 86400000;

// Campaign rows joined with their funnel counts from analytics.
export function withFunnel(campaigns, funnel = []) {
  const byId = new Map(funnel.map((f) => [f.id, f]));
  return campaigns.map((c) => {
    const f = byId.get(c.id) || {
      totalAttempts: 0,
      opened: 0,
      clicked: 0,
      submitted: 0,
      reported: 0,
    };
    return {
      ...c,
      targets: f.totalAttempts,
      opened: f.opened,
      clicked: f.clicked,
      submitted: f.submitted,
      reported: f.reported,
      openRate: rate(f.opened, f.totalAttempts),
      clickRate: rate(f.clicked, f.totalAttempts),
      reportRate: rate(f.reported, f.totalAttempts),
    };
  });
}

export function totals(rows) {
  const sum = rows.reduce(
    (acc, r) => ({
      targets: acc.targets + r.targets,
      clicked: acc.clicked + r.clicked,
      reported: acc.reported + r.reported,
      opened: acc.opened + r.opened,
      submitted: acc.submitted + r.submitted,
    }),
    { targets: 0, clicked: 0, reported: 0, opened: 0, submitted: 0 },
  );
  return {
    ...sum,
    clickRate: rate(sum.clicked, sum.targets),
    reportRate: rate(sum.reported, sum.targets),
  };
}

// Click rate per template, worst first: [{ key, name, rate, targets }]
export function failRatesByTemplate(rows, templates = []) {
  const names = new Map(templates.map((t) => [t.key, t.name]));
  const byKey = new Map();
  rows.forEach((r) => {
    if (!r.templateKey || r.targets === 0) return;
    const acc = byKey.get(r.templateKey) || { targets: 0, clicked: 0 };
    byKey.set(r.templateKey, {
      targets: acc.targets + r.targets,
      clicked: acc.clicked + r.clicked,
    });
  });
  return [...byKey.entries()]
    .map(([key, v]) => ({
      key,
      name: names.get(key) || key,
      rate: rate(v.clicked, v.targets),
      targets: v.targets,
    }))
    .sort((a, b) => b.rate - a.rate);
}

// Weekly series (0–100) from analytics.trend for a field ('avgRisk' | 'clickRate').
export const trendSeries = (trend = [], field) =>
  trend.filter((t) => t[field] !== null).map((t) => Math.round(t[field] * 1000) / 10);

// Chronological per-campaign report rate (0–100) for campaigns that went out.
export const reportRateSeries = (rows) =>
  [...rows]
    .filter((r) => r.targets > 0)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((r) => Math.round(r.reportRate * 1000) / 10);

// Indices of the n highest values (for pin labels).
export const topIndices = (values, n = 2) =>
  values
    .map((v, i) => [v, i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, n)
    .map(([, i]) => i)
    .sort((a, b) => a - b);
