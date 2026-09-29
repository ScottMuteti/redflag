// Illustrative data for the landing-page product preview only (not an organisation's real data).

export const previewStats = [
  {
    label: 'Org risk score',
    period: 'This week',
    value: 38,
    suffix: '/100',
    trend: -6.2,
    invertGood: true,
    series: [61, 58, 55, 57, 49, 44, 38],
  },
  {
    label: 'Report rate',
    period: 'This week',
    value: '46%',
    trend: 12.5,
    series: [18, 22, 21, 29, 33, 41, 46],
  },
];

export const previewTrend = [
  { label: 'Wave 1', value: 64 },
  { label: 'Wave 2', value: 59 },
  { label: 'Wave 3', value: 61 },
  { label: 'Wave 4', value: 52 },
  { label: 'Wave 5', value: 47 },
  { label: 'Wave 6', value: 41 },
  { label: 'Wave 7', value: 38 },
];

export const previewCampaigns = [
  { id: 'C-104', name: 'M-Pesa reversal SMS', channel: 'SMS', status: 'running' },
  { id: 'C-103', name: 'KRA iTax deadline', channel: 'Email', status: 'completed' },
  { id: 'C-102', name: 'Safaricom account check', channel: 'Email', status: 'scheduled' },
];

export const previewTooltip = {
  title: 'Finance dept.',
  value: 'Click rate ↓ 18%',
  note: 'after 2 training rounds',
};
