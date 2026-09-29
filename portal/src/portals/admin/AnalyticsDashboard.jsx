import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { getOrganizationAnalytics } from '../../api/analytics';
import { listCampaigns, listTemplates } from '../../api/campaigns';
import { listDepartments, listEmployees } from '../../api/employees';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/legacy';
import StatCard from '../../components/dashboard/StatCard';
import TrendCard from '../../components/dashboard/TrendCard';
import GaugeCard from '../../components/dashboard/GaugeCard';
import ProfileCard from '../../components/dashboard/ProfileCard';
import TemplateStackCard from '../../components/dashboard/TemplateStackCard';
import EventListCard from '../../components/dashboard/EventListCard';
import SecurityCard from '../../components/dashboard/SecurityCard';
import { formatNumber, formatPercent } from '../../lib/format';
import { fallbackTemplates, recentEvents, trainingDeltaVsLastMonth } from '../../mocks/dashboard';

const DAY = 24 * 60 * 60 * 1000;
const WEEKS_SHOWN = 7;

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

// Index 0 = oldest week, last = current week.
function weekIndex(date, now) {
  const weeksAgo = Math.round((startOfWeek(now) - startOfWeek(date)) / (7 * DAY));
  return WEEKS_SHOWN - 1 - weeksAgo;
}

function campaignsPerWeek(campaigns, now) {
  const counts = new Array(WEEKS_SHOWN).fill(0);
  campaigns.forEach((c) => {
    const i = weekIndex(c.createdAt, now);
    if (i >= 0 && i < WEEKS_SHOWN) counts[i] += 1;
  });
  return counts;
}

// Running headcount at the end of each week.
function headcountPerWeek(employees, now) {
  const weekEnds = Array.from(
    { length: WEEKS_SHOWN },
    (_, i) => new Date(startOfWeek(now).getTime() - (WEEKS_SHOWN - 2 - i) * 7 * DAY),
  );
  return weekEnds.map((end) => employees.filter((e) => new Date(e.createdAt) < end).length);
}

const rate = (part, whole) => (whole > 0 ? part / whole : null);

// Latest campaign vs all earlier ones, in percentage points.
function reportRateDelta(campaigns) {
  const sent = campaigns.filter((c) => c.totalAttempts > 0);
  if (sent.length < 2) return null;
  const [latest, ...earlier] = sent;
  const earlierTotals = earlier.reduce(
    (acc, c) => ({ sent: acc.sent + c.totalAttempts, reported: acc.reported + c.reported }),
    { sent: 0, reported: 0 },
  );
  return (
    (rate(latest.reported, latest.totalAttempts) -
      rate(earlierTotals.reported, earlierTotals.sent)) *
    100
  );
}

const weekLabel = (iso) =>
  `Week of ${new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`;
const monthLabel = (key) =>
  new Date(`${key}-01`).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });

function vulnerabilitySeries(trend, period) {
  const weekly = trend
    .filter((t) => t.avgRisk !== null)
    .map((t) => ({ key: t.week, value: t.avgRisk * 100 }));
  if (period === 'weekly') return weekly.map((p) => ({ label: weekLabel(p.key), value: p.value }));

  const byMonth = new Map();
  weekly.forEach((p) => {
    const month = p.key.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) || []), p.value]);
  });
  return [...byMonth.entries()].map(([month, values]) => ({
    label: monthLabel(month),
    value: values.reduce((a, b) => a + b, 0) / values.length,
  }));
}

// Show the three Kenyan headline scenarios when the org has them, back to front.
const PREFERRED = [/safaricom/i, /kra/i, /m-?pesa/i];

function pickTemplates(templates) {
  if (templates.length === 0) return fallbackTemplates;
  const picked = PREFERRED.map((re) => templates.find((t) => re.test(t.name))).filter(Boolean);
  templates.forEach((t) => {
    if (picked.length < 3 && !picked.includes(t)) picked.unshift(t);
  });
  return picked
    .slice(-3)
    .map((t) => ({ ...t, category: CATEGORY_LABELS[t.category] || t.category }));
}

const CATEGORY_LABELS = {
  mpesa: 'Mobile money',
  kra: 'Tax compliance',
  safaricom: 'Telco support',
  invoice: 'Invoice fraud',
};

const PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
];

function AnalyticsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('weekly');

  useEffect(() => {
    const valueOr = (result, fallback) => (result.status === 'fulfilled' ? result.value : fallback);
    Promise.allSettled([
      getOrganizationAnalytics(),
      listCampaigns(),
      listEmployees(),
      listDepartments(),
      listTemplates(),
    ]).then(([analytics, campaigns, employees, departments, templates]) =>
      setData({
        analytics: valueOr(analytics, null),
        campaigns: valueOr(campaigns, []),
        employees: valueOr(employees, []),
        departments: valueOr(departments, []),
        templates: valueOr(templates, []),
      }),
    );
  }, []);

  const trendData = useMemo(
    () => (data?.analytics ? vulnerabilitySeries(data.analytics.trend, period) : []),
    [data, period],
  );

  if (!data) return <Loading />;

  const now = new Date();
  const { analytics, campaigns, employees, departments, templates } = data;
  const funnel = analytics?.campaigns || [];
  const trend = analytics?.trend || [];
  const training = analytics?.training || { totalAssignments: 0, completedAssignments: 0 };

  const campaignsThisMonth = campaigns.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totals = funnel.reduce(
    (acc, c) => ({
      sent: acc.sent + c.totalAttempts,
      clicked: acc.clicked + c.clicked,
      reported: acc.reported + c.reported,
    }),
    { sent: 0, clicked: 0, reported: 0 },
  );
  const reportRate = rate(totals.reported, totals.sent);

  const clickSeries = trend.filter((t) => t.clickRate !== null).map((t) => t.clickRate);
  const lastClick = clickSeries.at(-1) ?? rate(totals.clicked, totals.sent);
  const clickDelta =
    clickSeries.length >= 2 ? (clickSeries.at(-1) - clickSeries.at(-2)) * 100 : null;

  const riskSeries = trend.filter((t) => t.avgRisk !== null).map((t) => t.avgRisk * 100);
  const riskScore = analytics?.riskScore;

  const improving = trendData.length >= 2 && trendData.at(-1).value < trendData[0].value;
  const status =
    trendData.length >= 2
      ? improving
        ? { tone: 'good', label: 'On track' }
        : { tone: 'warn', label: 'Needs attention' }
      : null;

  const completionRatio = rate(training.completedAssignments, training.totalAssignments);

  return (
    <div className="d-grid">
      <StatCard
        variant="bars"
        label="Campaigns this month"
        value={formatNumber(campaignsThisMonth)}
        series={campaignsPerWeek(campaigns, now)}
        highlightIndex={WEEKS_SHOWN - 1}
        index={0}
      />
      <StatCard
        variant="sparkline"
        label="Employees enrolled"
        value={formatNumber(employees.length)}
        icon={Users}
        series={headcountPerWeek(employees, now)}
        index={1}
      />
      <StatCard
        variant="icon"
        label="Report rate"
        value={formatPercent(reportRate)}
        icon={ShieldCheck}
        index={2}
      />
      <StatCard
        variant="highlight"
        label="Org risk score"
        value={riskScore === null || riskScore === undefined ? '—' : Math.round(riskScore * 100)}
        suffix={riskScore === null || riskScore === undefined ? null : '/100'}
        series={riskSeries}
        index={3}
      />

      <TrendCard
        title="Vulnerability trend"
        status={status}
        periods={PERIODS}
        period={period}
        onPeriodChange={setPeriod}
        floats={[
          {
            label: 'Click rate',
            value: formatPercent(lastClick),
            delta: clickDelta,
            invertGood: true,
          },
          {
            label: 'Report rate',
            value: formatPercent(reportRate),
            delta: reportRateDelta(funnel),
          },
        ]}
        data={trendData}
        formatValue={(v) => `${Math.round(v)}/100`}
        emptyText="The trend appears after risk scores are computed in two or more periods."
        index={4}
      />
      <GaugeCard
        title="Training completion"
        label="Assigned modules"
        value={`${formatNumber(training.completedAssignments)}/${formatNumber(training.totalAssignments)}`}
        caption={`Completion is ${trainingDeltaVsLastMonth}% higher than last month`}
        ratio={completionRatio}
        index={5}
      />
      <ProfileCard
        name={user?.fullName || 'Admin'}
        email={user?.email}
        stats={[
          { label: 'Campaigns', value: campaigns.length },
          { label: 'Employees', value: employees.length },
          { label: 'Departments', value: departments.length },
        ]}
        index={6}
      />

      <TemplateStackCard
        title="Simulation Templates"
        description="M-Pesa, Safaricom, KRA and invoice-fraud scenarios ready to launch."
        action={{ label: 'New Campaign', to: '/admin/campaigns' }}
        templates={pickTemplates(templates)}
        index={7}
      />
      <EventListCard
        title="Recent Events"
        events={recentEvents}
        emptyText="No simulation activity yet."
        index={8}
      />
      <SecurityCard
        title="Stay sharp!"
        subtitle="Review high-risk employees"
        action={{ label: 'View At-Risk Employees', to: '/admin/employees' }}
        index={9}
      />
    </div>
  );
}

export default AnalyticsDashboard;
