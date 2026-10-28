import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { getOrganizationAnalytics, getScoreRanges } from '../../api/analytics';
import { listCampaigns } from '../../api/campaigns';
import { computeAllScores } from '../../api/scoring';
import {
  Button,
  Card,
  CardHeader,
  DropdownButton,
  ErrorCard,
  LineTrend,
  LollipopChart,
  PageHeader,
  ProgressRow,
  Skeleton,
  StatCard,
  useToast,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatPercent, formatShortDate, toScore } from '../../lib/format';
import { totals, withFunnel } from '../../lib/metrics';

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const monthLabel = new Intl.DateTimeFormat('en-KE', { month: 'short' });
const pct = (v) => `${v}%`;

export function rangeLabel(bucket, period) {
  const d = new Date(bucket);
  if (period === 'daily') return d.toLocaleDateString('en-KE', { weekday: 'short' });
  if (period === 'monthly') return monthLabel.format(d);
  return formatShortDate(d);
}

function AnalyticsPage() {
  const toast = useToast();
  const [period, setPeriod] = useState('weekly');
  const [scoring, setScoring] = useState(false);

  const { data, error, loading, reload } = useAsync(() =>
    Promise.all([getOrganizationAnalytics(), listCampaigns()]).then(([analytics, campaigns]) => ({
      analytics,
      rows: withFunnel(campaigns, analytics.campaigns),
    })),
  );
  const ranges = useAsync(() => getScoreRanges(period), [period]);

  const view = useMemo(() => {
    if (!data) return null;
    const { analytics, rows } = data;
    return {
      sum: totals(rows),
      trend: analytics.trend.map((t) => ({
        label: formatShortDate(t.week),
        risk: t.avgRisk === null ? null : Math.round(t.avgRisk * 100),
        clicks: t.clickRate === null ? null : Math.round(t.clickRate * 100),
      })),
      campaigns: rows
        .filter((r) => r.targets > 0)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((r) => ({
          label: r.name.length > 14 ? `${r.name.slice(0, 13)}…` : r.name,
          opened: Math.round((r.openRate || 0) * 100),
          clicked: Math.round((r.clickRate || 0) * 100),
          reported: Math.round((r.reportRate || 0) * 100),
        })),
      departments: [...analytics.departments].sort((a, b) => b.avgScore - a.avgScore),
    };
  }, [data]);

  async function rescoreAll() {
    setScoring(true);
    try {
      const { scored, failed } = await computeAllScores();
      toast.success(`Scored ${scored} employees${failed ? `, ${failed} failed` : ''}`);
      reload();
      ranges.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not compute scores');
    } finally {
      setScoring(false);
    }
  }

  if (error) return <ErrorCard message={error} onRetry={reload} />;
  const a = data?.analytics;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Trends across campaigns and departments"
        actions={
          <Button variant="primary" icon={Calculator} loading={scoring} onClick={rescoreAll}>
            Recompute all scores
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          loading={loading}
          label="Org risk score"
          value={toScore(a?.riskScore) ?? '—'}
          suffix={a?.riskScore !== null ? '/100' : undefined}
        />
        <StatCard
          index={1}
          loading={loading}
          label="Click rate"
          value={formatPercent(view?.sum.clickRate)}
        />
        <StatCard
          index={2}
          loading={loading}
          label="Report rate"
          value={formatPercent(view?.sum.reportRate)}
        />
        <StatCard
          index={3}
          loading={loading}
          label="Training completion"
          value={formatPercent(a?.training.completionRate)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card index={4}>
          <CardHeader title="Weekly trend" subtitle="Average risk score and click rate (0–100)" />
          {loading ? (
            <Skeleton className="h-56" />
          ) : view.trend.length < 2 ? (
            <p className="py-10 text-center text-body text-ink-3">
              The trend appears after two weeks of data.
            </p>
          ) : (
            <LineTrend
              data={view.trend}
              series={[
                { key: 'risk', name: 'Avg risk', color: 'var(--brand-700)' },
                { key: 'clicks', name: 'Click rate', color: 'var(--text-muted)', dashed: true },
              ]}
              format={pct}
              label="Weekly average risk and click rate"
            />
          )}
        </Card>

        <Card index={5}>
          <CardHeader
            title="Score range"
            subtitle="Lowest to highest employee score per period"
            action={<DropdownButton options={PERIODS} value={period} onChange={setPeriod} />}
          />
          {ranges.loading ? (
            <Skeleton className="h-56" />
          ) : !ranges.data?.length ? (
            <p className="py-10 text-center text-body text-ink-3">No scores in this period.</p>
          ) : (
            <LollipopChart
              data={ranges.data.map((r) => ({
                label: rangeLabel(r.bucket, period),
                min: r.min,
                max: r.max,
              }))}
              height={230}
              label={`Score ranges (${period})`}
            />
          )}
        </Card>

        <Card index={6}>
          <CardHeader
            title="Campaign funnel"
            subtitle="Opened, clicked and reported per campaign (%)"
          />
          {loading ? (
            <Skeleton className="h-56" />
          ) : view.campaigns.length === 0 ? (
            <p className="py-10 text-center text-body text-ink-3">No launched campaigns yet.</p>
          ) : (
            <LineTrend
              data={view.campaigns}
              series={[
                { key: 'opened', name: 'Opened', color: 'var(--text-muted)', dashed: true },
                { key: 'clicked', name: 'Clicked', color: 'var(--danger)' },
                { key: 'reported', name: 'Reported', color: 'var(--success)' },
              ]}
              format={pct}
              label="Campaign funnel rates"
            />
          )}
        </Card>

        <Card index={7}>
          <CardHeader title="Departments" subtitle="Average latest risk score" />
          {loading ? (
            <Skeleton className="h-40" />
          ) : view.departments.length === 0 ? (
            <p className="text-body text-ink-3">Compute employee scores to rank departments.</p>
          ) : (
            <div className="grid gap-4">
              {view.departments.map((d) => (
                <ProgressRow
                  key={d.department}
                  label={`${d.department} (${d.employeeCount})`}
                  value={d.avgScore}
                  detail={`${toScore(d.avgScore)}/100`}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export default AnalyticsPage;
