/* eslint-disable react/prop-types -- page-local cells */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  Flag,
  GraduationCap,
  Mail,
  MessageSquare,
  MousePointerClick,
  RotateCw,
  TriangleAlert,
} from 'lucide-react';
import { getOrganizationAnalytics } from '../../api/analytics';
import { listCampaigns, listTemplates } from '../../api/campaigns';
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  Chip,
  DataTable,
  DropdownButton,
  EmptyState,
  ErrorCard,
  IconButton,
  LollipopChart,
  PageHeader,
  ProgressRow,
  Skeleton,
  Sparkline,
  StatCard,
  StatusBadge,
} from '../../components/ui';
import { settle, useAsync } from '../../lib/useAsync';
import { downloadCsv } from '../../lib/csv';
import { formatDateTime, formatPercent, relativeTime, toScore } from '../../lib/format';
import {
  DATE_RANGES,
  failRatesByTemplate,
  inRange,
  lastDelta,
  reportRateSeries,
  topIndices,
  totals,
  trendSeries,
  withFunnel,
} from '../../lib/metrics';
import { recentEvents, vulnerabilityRanges } from '../../mocks/dashboard';

const CHANNELS = [
  { value: 'all', label: 'All channels' },
  { value: 'email', label: 'Email only' },
  { value: 'sms', label: 'SMS only' },
];

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const EVENT_META = {
  reported: { tone: 'success', label: 'Reported', icon: Flag },
  completed: { tone: 'success', label: 'Trained', icon: GraduationCap },
  clicked: { tone: 'danger', label: 'Clicked', icon: MousePointerClick },
  submitted: { tone: 'danger', label: 'Submitted', icon: TriangleAlert },
};

const pct = (v) => `${v}%`;

function ChannelCell({ type }) {
  const Icon = type === 'sms' ? MessageSquare : Mail;
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-2">
      <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
      {type === 'sms' ? 'SMS' : 'Email'}
    </span>
  );
}

function OverviewPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState('all');
  const [channel, setChannel] = useState('all');
  const [period, setPeriod] = useState('weekly');

  const { data, error, loading, reload } = useAsync(() =>
    Promise.all([getOrganizationAnalytics(), listCampaigns(), settle(listTemplates(), [])]).then(
      ([analytics, campaigns, templates]) => ({ analytics, campaigns, templates }),
    ),
  );

  const view = useMemo(() => {
    if (!data) return null;
    const { analytics, campaigns, templates } = data;
    const rows = withFunnel(campaigns, analytics.campaigns).filter(
      (c) => inRange(c.createdAt, range) && (channel === 'all' || c.type === channel),
    );
    const templateNames = new Map(templates.map((t) => [t.key, t.name]));
    const riskSeries = trendSeries(analytics.trend, 'avgRisk');
    const clickSeries = trendSeries(analytics.trend, 'clickRate');
    const reportSeries = reportRateSeries(rows);
    const sum = totals(rows);
    const departments = [...analytics.departments].sort((a, b) => b.avgScore - a.avgScore);
    return {
      rows: rows.map((r) => ({ ...r, templateName: templateNames.get(r.templateKey) })),
      sum,
      riskScore: toScore(analytics.riskScore),
      riskSeries,
      clickSeries,
      reportSeries,
      failing: failRatesByTemplate(rows, templates).slice(0, 4),
      departments,
    };
  }, [data, range, channel]);

  function exportCampaigns() {
    downloadCsv('redflag-campaigns.csv', view.rows, [
      { header: 'ID', value: (r) => r.id },
      { header: 'Campaign', value: (r) => r.name },
      { header: 'Channel', value: (r) => r.type },
      { header: 'Status', value: (r) => r.status },
      { header: 'Targets', value: (r) => r.targets },
      { header: 'Clicked', value: (r) => r.clicked },
      { header: 'Reported', value: (r) => r.reported },
      { header: 'Click rate', value: (r) => (r.clickRate === null ? '' : r.clickRate.toFixed(3)) },
    ]);
  }

  function exportDepartments() {
    downloadCsv('redflag-departments.csv', view.departments, [
      { header: 'Department', value: (d) => d.department },
      { header: 'Average risk (0-100)', value: (d) => toScore(d.avgScore) },
      { header: 'Employees scored', value: (d) => d.employeeCount },
    ]);
  }

  const columns = [
    {
      key: 'id',
      header: 'ID',
      sortValue: (r) => r.id,
      render: (r) => <span className="text-ink-3">#{r.id}</span>,
    },
    {
      key: 'name',
      header: 'Campaign Name',
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="block max-w-[220px]">
          <span className="block truncate font-semibold">{r.name}</span>
          {r.templateName && (
            <span className="block truncate text-xs text-ink-3">{r.templateName}</span>
          )}
        </span>
      ),
    },
    { key: 'type', header: 'Channel', render: (r) => <ChannelCell type={r.type} /> },
    { key: 'targets', header: 'Targets', align: 'right', sortValue: (r) => r.targets },
    {
      key: 'clickRate',
      header: 'Click Rate',
      align: 'right',
      sortValue: (r) => r.clickRate ?? -1,
      render: (r) => <span className="font-semibold">{formatPercent(r.clickRate)}</span>,
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const header = (
    <PageHeader
      title="Overview"
      subtitle="Your organisation's human security posture"
      actions={
        <>
          <DropdownButton
            icon={CalendarDays}
            options={DATE_RANGES}
            value={range}
            onChange={setRange}
          />
          <DropdownButton
            label="Export"
            icon={Download}
            items={[
              { label: 'Campaigns (CSV)', onClick: exportCampaigns, disabled: !view },
              { label: 'Departments (CSV)', onClick: exportDepartments, disabled: !view },
            ]}
          />
          <DropdownButton
            iconOnly
            icon={Filter}
            menuLabel="Filter by channel"
            options={CHANNELS}
            value={channel}
            onChange={setChannel}
          />
        </>
      }
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorCard message={error} onRetry={reload} />
      </>
    );
  }

  return (
    <>
      {header}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          index={0}
          loading={loading}
          label="Org Risk Score"
          period="This week"
          value={view?.riskScore ?? '—'}
          suffix={view?.riskScore !== null ? '/100' : undefined}
          trend={view && lastDelta(view.riskSeries)}
          invertGood
          series={view?.riskSeries}
        />
        <StatCard
          index={1}
          loading={loading}
          label="Click Rate"
          period="This week"
          value={view ? formatPercent(view.sum.clickRate) : '—'}
          trend={view && lastDelta(view.clickSeries)}
          invertGood
          series={view?.clickSeries}
          formatPoint={pct}
        />
        <StatCard
          index={2}
          loading={loading}
          label="Report Rate"
          period="Per campaign"
          value={view ? formatPercent(view.sum.reportRate) : '—'}
          trend={view && lastDelta(view.reportSeries)}
          trendLabel="than last campaign"
          series={view?.reportSeries}
          formatPoint={pct}
          className="md:col-span-2 xl:col-span-1"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card index={3} padded={false} className="xl:col-span-2">
          <CardHeader
            className="px-5 pt-5"
            title="Recent Campaigns"
            action={
              <>
                <IconButton icon={RotateCw} label="Refresh campaigns" size={32} onClick={reload} />
                <Link
                  to="/admin/campaigns"
                  className="text-xs font-bold text-brand-700 hover:underline"
                >
                  See All
                </Link>
              </>
            }
          />
          <DataTable
            caption="Recent campaigns"
            columns={columns}
            rows={view ? [...view.rows].sort((a, b) => b.id - a.id) : []}
            loading={loading}
            pageSize={6}
            onRowClick={(r) => navigate(`/admin/campaigns/${r.id}`)}
            empty={
              <EmptyState
                title="No campaigns in this range"
                description="Launch a simulation to start measuring."
                action={
                  <Link
                    to="/admin/campaigns/new"
                    className="text-body font-semibold text-brand-700 hover:underline"
                  >
                    New campaign
                  </Link>
                }
              />
            }
          />
        </Card>

        <div className="grid content-start gap-4">
          <Card index={4}>
            <CardHeader
              title="Top Failing Attack Types"
              subtitle="Click rate by template"
              action={
                <Link
                  to="/admin/templates"
                  className="text-xs font-bold text-brand-700 hover:underline"
                >
                  See All
                </Link>
              }
            />
            {loading ? (
              <div className="grid gap-4">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            ) : view.failing.length === 0 ? (
              <p className="text-body text-ink-3">No simulation results yet.</p>
            ) : (
              <div className="grid gap-4">
                {view.failing.map((t) => (
                  <ProgressRow key={t.key} label={t.name} value={t.rate} />
                ))}
              </div>
            )}
          </Card>

          <Card index={5}>
            {/* TODO: replace with API — events come from mocks/dashboard.js */}
            <CardHeader title="Recent Events" />
            <ul className="grid gap-3.5">
              {recentEvents.map((e) => {
                const meta = EVENT_META[e.outcome];
                return (
                  <li key={e.id} className="flex items-center gap-3">
                    <Avatar icon={meta.icon} tone={meta.tone} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body text-ink">
                        <strong className="font-semibold">{e.name}</strong> {e.text}
                      </p>
                      <time
                        dateTime={e.at}
                        title={formatDateTime(e.at)}
                        className="text-xs text-ink-3"
                      >
                        {relativeTime(e.at)}
                      </time>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card index={6}>
          <CardHeader title="Highest-Risk Departments" subtitle="Weighted by simulation exposure" />
          {loading ? (
            <Skeleton className="h-40" />
          ) : (
            <>
              <div className="flex items-end gap-2">
                <span className="text-stat leading-none font-bold text-ink">
                  {view.riskScore ?? '—'}
                </span>
                <span className="pb-0.5 text-body text-ink-3">/100 org score</span>
              </div>
              {view.riskSeries.length >= 2 ? (
                <Sparkline
                  data={view.riskSeries}
                  highlight={-1}
                  pins={topIndices(view.riskSeries, 2)}
                  height={110}
                  label={`Weekly org risk: ${view.riskSeries.join(', ')}`}
                />
              ) : (
                <p className="py-6 text-body text-ink-3">
                  The trend appears after two weeks of scores.
                </p>
              )}
              {view.departments.length === 0 ? (
                <p className="text-body text-ink-3">Compute employee scores to rank departments.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {view.departments.map((d) => (
                    <Chip key={d.department}>
                      {d.department}
                      <strong className="text-ink">{toScore(d.avgScore)}</strong>
                    </Chip>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>

        <Card index={7}>
          {/* TODO: replace with API — score ranges come from mocks/dashboard.js */}
          <CardHeader
            title="Vulnerability Analytics"
            subtitle="Score range across employees per simulation wave"
            action={<DropdownButton options={PERIODS} value={period} onChange={setPeriod} />}
          />
          <LollipopChart
            data={vulnerabilityRanges[period]}
            height={230}
            label={`Vulnerability score ranges (${period}): ${vulnerabilityRanges[period]
              .map((d) => `${d.label} ${d.min} to ${d.max}`)
              .join('; ')}`}
          />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
            <CheckCircle2 size={13} className="text-success" aria-hidden="true" />
            Lower and tighter ranges mean fewer highly vulnerable employees.
          </p>
        </Card>
      </div>
    </>
  );
}

export default OverviewPage;
