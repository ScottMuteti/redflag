import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Mail, MessageSquare, Rocket, Square, Trash2 } from 'lucide-react';
import {
  deleteCampaign,
  getCampaign,
  getCampaignResults,
  launchCampaign,
  listTemplates,
  stopCampaign,
} from '../../api/campaigns';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorCard,
  PageHeader,
  ProgressRow,
  Skeleton,
  StatCard,
  StatusBadge,
  Tabs,
  useToast,
} from '../../components/ui';
import AuthorisationCheck from '../../components/AuthorisationCheck';
import { settle, useAsync } from '../../lib/useAsync';
import { downloadCsv } from '../../lib/csv';
import { formatDate, formatDateTime, formatPercent } from '../../lib/format';
import { rate } from '../../lib/metrics';

// Worst thing each person did, for the outcome column and filter.
function outcomeOf(r) {
  if (r.submittedCredentialsAt) return 'submitted';
  if (r.clickedAt) return 'clicked';
  if (r.reportedAt) return 'reported';
  if (r.openedAt) return 'opened';
  if (r.sentAt) return 'delivered';
  return 'pending';
}

const OUTCOME = {
  submitted: { tone: 'danger', label: 'Submitted data' },
  clicked: { tone: 'danger', label: 'Clicked' },
  reported: { tone: 'success', label: 'Reported' },
  opened: { tone: 'warning', label: 'Opened' },
  delivered: { tone: 'neutral', label: 'Delivered' },
  pending: { tone: 'neutral', label: 'Not sent' },
};

const FILTERS = ['all', 'clicked', 'submitted', 'reported', 'opened', 'delivered'];

function CampaignResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [authorised, setAuthorised] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () =>
      Promise.all([getCampaign(id), getCampaignResults(id), settle(listTemplates(), [])]).then(
        ([campaign, results, templates]) => ({
          campaign,
          results: results.map((r) => ({ ...r, outcome: outcomeOf(r) })),
          template: templates.find((t) => t.key === campaign.templateKey),
        }),
      ),
    [id],
  );

  const stats = useMemo(() => {
    const rows = data?.results || [];
    const n = rows.length;
    const count = (field) => rows.filter((r) => r[field]).length;
    return {
      n,
      opened: rate(count('openedAt'), n),
      clicked: rate(count('clickedAt'), n),
      submitted: rate(count('submittedCredentialsAt'), n),
      reported: rate(count('reportedAt'), n),
      counts: Object.fromEntries(
        FILTERS.map((f) => [f, f === 'all' ? n : rows.filter((r) => r.outcome === f).length]),
      ),
      departments: Object.values(
        rows.reduce((acc, r) => {
          const key = r.departmentName || 'Unassigned';
          acc[key] = acc[key] || { name: key, n: 0, clicked: 0 };
          acc[key].n += 1;
          if (r.clickedAt) acc[key].clicked += 1;
          return acc;
        }, {}),
      ).sort((a, b) => b.clicked / b.n - a.clicked / a.n),
    };
  }, [data]);

  async function run(action) {
    setBusy(true);
    try {
      if (action === 'launch') {
        const { message } = await launchCampaign(id, { acknowledgeAuthorisation: authorised });
        toast.success(message || 'Campaign launched');
      } else if (action === 'stop') {
        await stopCampaign(id);
        toast.success('Campaign stopped');
      } else {
        await deleteCampaign(id);
        toast.success('Campaign deleted');
        navigate('/admin/campaigns');
        return;
      }
      reload();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(
        `${err.response?.data?.message || 'Action failed'}${detail ? `: ${detail}` : ''}`,
      );
    } finally {
      setBusy(false);
      setConfirm(null);
      setAuthorised(false);
      if (action === 'launch') reload();
    }
  }

  if (error) return <ErrorCard message={error} onRetry={reload} />;
  const c = data?.campaign;
  const rows = (data?.results || []).filter((r) => filter === 'all' || r.outcome === filter);

  const columns = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortValue: (r) => r.employeeName,
      render: (r) => (
        <span className="block">
          <span className="block font-semibold">{r.employeeName}</span>
          <span className="block text-xs text-ink-3">{r.departmentName || 'No department'}</span>
        </span>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      sortValue: (r) => r.outcome,
      render: (r) => <Badge tone={OUTCOME[r.outcome].tone}>{OUTCOME[r.outcome].label}</Badge>,
    },
    {
      key: 'sentAt',
      header: 'Sent',
      sortValue: (r) => r.sentAt,
      render: (r) => formatDateTime(r.sentAt),
    },
    {
      key: 'openedAt',
      header: 'Opened',
      sortValue: (r) => r.openedAt,
      render: (r) => formatDateTime(r.openedAt),
    },
    {
      key: 'clickedAt',
      header: 'Clicked',
      sortValue: (r) => r.clickedAt,
      render: (r) => formatDateTime(r.clickedAt),
    },
    {
      key: 'reportedAt',
      header: 'Reported',
      sortValue: (r) => r.reportedAt,
      render: (r) => formatDateTime(r.reportedAt),
    },
  ];

  return (
    <>
      <PageHeader
        title={c?.name || 'Campaign'}
        subtitle={
          c ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {c.type === 'sms' ? <MessageSquare size={14} /> : <Mail size={14} />}
              {c.type === 'sms' ? 'SMS' : 'Email'} · {data.template?.name || c.templateKey} ·{' '}
              {c.departmentName || 'Everyone'} · created {formatDate(c.createdAt)}
              <StatusBadge status={c.status} />
            </span>
          ) : (
            'Loading…'
          )
        }
        actions={
          <>
            <Button as={Link} to="/admin/campaigns" icon={ArrowLeft}>
              Campaigns
            </Button>
            {c && ['draft', 'scheduled', 'failed'].includes(c.status) && (
              <Button variant="primary" icon={Rocket} onClick={() => setConfirm('launch')}>
                Launch now
              </Button>
            )}
            {c && ['running', 'scheduled'].includes(c.status) && (
              <Button icon={Square} onClick={() => setConfirm('stop')}>
                {c.status === 'scheduled' ? 'Unschedule' : 'Stop'}
              </Button>
            )}
            {['draft', 'failed'].includes(c?.status) && (
              <Button variant="danger" icon={Trash2} onClick={() => setConfirm('delete')}>
                Delete
              </Button>
            )}
            <Button
              icon={Download}
              disabled={!data?.results.length}
              onClick={() =>
                downloadCsv(`redflag-campaign-${id}.csv`, data.results, [
                  { header: 'Employee', value: (r) => r.employeeName },
                  { header: 'Email', value: (r) => r.email },
                  { header: 'Department', value: (r) => r.departmentName },
                  { header: 'Outcome', value: (r) => OUTCOME[r.outcome].label },
                  { header: 'Sent', value: (r) => r.sentAt },
                  { header: 'Opened', value: (r) => r.openedAt },
                  { header: 'Clicked', value: (r) => r.clickedAt },
                  { header: 'Submitted', value: (r) => r.submittedCredentialsAt },
                  { header: 'Reported', value: (r) => r.reportedAt },
                ])
              }
            >
              Export
            </Button>
          </>
        }
      />

      {c?.status === 'failed' && (
        <div
          role="alert"
          className="mb-4 rounded-card border border-danger bg-danger-bg p-4 text-body text-danger"
        >
          <p className="font-semibold">Launch failed</p>
          {c.failureReason && <p className="mt-1">{c.failureReason}</p>}
          <p className="mt-1 text-ink-2">Fix the cause, then use Launch now to retry.</p>
        </div>
      )}
      {c?.authorisedAt && (
        <p className="mb-4 text-xs text-ink-3">
          Authorisation confirmed {formatDate(c.authorisedAt)}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} loading={loading} label="Targets" value={stats.n} />
        <StatCard index={1} loading={loading} label="Opened" value={formatPercent(stats.opened)} />
        <StatCard
          index={2}
          loading={loading}
          label="Clicked"
          value={formatPercent(stats.clicked)}
        />
        <StatCard
          index={3}
          loading={loading}
          label="Reported"
          value={formatPercent(stats.reported)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card index={4} padded={false} className="xl:col-span-2">
          <div className="px-5 pt-4">
            <Tabs
              label="Filter by outcome"
              value={filter}
              onChange={setFilter}
              tabs={FILTERS.map((f) => ({
                value: f,
                label: f === 'all' ? 'All' : OUTCOME[f].label,
                count: stats.counts[f],
              }))}
            />
          </div>
          <DataTable
            caption="Results per employee"
            rowKey="employeeId"
            columns={columns}
            rows={rows}
            loading={loading}
            empty={
              <EmptyState
                title={c?.status === 'draft' ? 'Not launched yet' : 'No results here'}
                description={
                  c?.status === 'draft'
                    ? 'Launch the campaign to start collecting results.'
                    : 'Try another outcome filter.'
                }
              />
            }
          />
        </Card>

        <div className="grid content-start gap-4">
          <Card index={5}>
            <CardHeader title="Funnel" subtitle="Share of targets at each stage" />
            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="grid gap-4">
                <ProgressRow label="Opened" value={stats.opened} />
                <ProgressRow label="Clicked the link" value={stats.clicked} />
                <ProgressRow label="Submitted data" value={stats.submitted} />
                <ProgressRow label="Reported it" value={stats.reported} />
              </div>
            )}
          </Card>
          <Card index={6}>
            <CardHeader title="Click rate by department" />
            {loading ? (
              <Skeleton className="h-24" />
            ) : stats.departments.length === 0 ? (
              <p className="text-body text-ink-3">No results yet.</p>
            ) : (
              <div className="grid gap-4">
                {stats.departments.map((d) => (
                  <ProgressRow
                    key={d.name}
                    label={d.name}
                    value={d.clicked / d.n}
                    detail={`${d.clicked}/${d.n}`}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm === 'launch'
            ? 'Launch campaign now?'
            : confirm === 'stop'
              ? 'Stop this campaign?'
              : 'Delete this campaign?'
        }
        message={
          confirm === 'launch'
            ? 'Messages go out to the selected audience straight away.'
            : confirm === 'stop'
              ? 'No further events will be tracked. Results so far are kept.'
              : 'The campaign will be removed. This can’t be undone.'
        }
        confirmLabel={confirm === 'launch' ? 'Launch' : confirm === 'stop' ? 'Stop' : 'Delete'}
        tone={confirm === 'launch' ? 'primary' : 'danger'}
        loading={busy}
        confirmDisabled={confirm === 'launch' && !authorised}
        onConfirm={() => run(confirm)}
        onCancel={() => {
          setConfirm(null);
          setAuthorised(false);
        }}
      >
        {confirm === 'launch' && (
          <AuthorisationCheck checked={authorised} onChange={setAuthorised} />
        )}
      </ConfirmDialog>
    </>
  );
}

export default CampaignResultsPage;
