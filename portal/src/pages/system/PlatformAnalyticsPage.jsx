import { useMemo } from 'react';
import { getPlatformAnalytics } from '../../api/system';
import {
  Card,
  CardHeader,
  ErrorCard,
  LineTrend,
  PageHeader,
  ProgressRow,
  StatCard,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatNumber, formatPercent } from '../../lib/format';

const pct = (v) => `${v}%`;
const toPct = (v) => (v === null || v === undefined ? null : Math.round(v * 100));
const monthLabel = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });

// Platform-wide aggregates across every organisation. No individual data.
function PlatformAnalyticsPage() {
  const { data, error, loading, reload } = useAsync(getPlatformAnalytics);
  const t = data?.totals;

  const trend = useMemo(
    () =>
      (data?.trend || []).map((m) => ({
        label: monthLabel(m.month),
        clicks: toPct(m.clickRate),
        reports: toPct(m.reportRate),
      })),
    [data],
  );

  return (
    <>
      <PageHeader title="Platform analytics" subtitle="Aggregated across every organisation" />
      {error && <ErrorCard message={error} onRetry={reload} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          loading={loading}
          label="Organisations"
          value={t ? formatNumber(t.organizations) : '—'}
          period={t?.suspendedOrganizations ? `${t.suspendedOrganizations} suspended` : undefined}
        />
        <StatCard index={1} loading={loading} label="Employees enrolled" value={t ? formatNumber(t.employees) : '—'} />
        <StatCard
          index={2}
          loading={loading}
          label="Messages sent"
          value={t ? formatNumber(t.messagesSent) : '—'}
          period={t ? `${formatNumber(t.campaigns)} campaigns · ${formatNumber(t.runningCampaigns)} running` : undefined}
        />
        <StatCard index={3} loading={loading} label="Click rate" value={formatPercent(t?.clickRate)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card index={4}>
          <CardHeader title="Monthly click and report rate" />
          {trend.length < 2 ? (
            <p className="py-10 text-center text-body text-ink-3">
              The trend appears after two months of sends.
            </p>
          ) : (
            <LineTrend
              data={trend}
              series={[
                { key: 'clicks', name: 'Click rate', color: 'var(--danger)' },
                { key: 'reports', name: 'Report rate', color: 'var(--success)' },
              ]}
              format={pct}
              label="Monthly click and report rate across the platform"
            />
          )}
        </Card>
        <Card index={5}>
          <CardHeader title="Outcomes" />
          <div className="grid gap-4">
            <ProgressRow label="Report rate" value={t?.reportRate} detail={formatPercent(t?.reportRate)} />
            <ProgressRow
              label="Training completion"
              value={t?.trainingCompletion}
              detail={formatPercent(t?.trainingCompletion)}
            />
            {(data?.byChannel || []).map((c) => (
              <ProgressRow
                key={c.channel}
                label={`${c.channel === 'sms' ? 'SMS' : 'Email'} click rate (${formatNumber(c.sent)} sent)`}
                value={c.clickRate}
                detail={formatPercent(c.clickRate)}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card index={6} className="mt-4">
        <CardHeader title="By industry" />
        {data?.industries?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.industries.map((i) => (
              <ProgressRow
                key={i.industry}
                label={`${i.industry} (${i.organizations} org${i.organizations === 1 ? '' : 's'})`}
                value={i.clickRate}
                detail={i.clickRate === null ? 'No sends yet' : `${formatPercent(i.clickRate)} clicked`}
              />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-body text-ink-3">No organisations yet.</p>
        )}
      </Card>
    </>
  );
}

export default PlatformAnalyticsPage;
