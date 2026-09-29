/* eslint-disable react/prop-types -- page-local cells */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Copy,
  Download,
  Eye,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Rocket,
  Square,
} from 'lucide-react';
import { getOrganizationAnalytics } from '../../api/analytics';
import { createCampaign, launchCampaign, listCampaigns } from '../../api/campaigns';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DropdownButton,
  EmptyState,
  ErrorCard,
  MiniBar,
  PageHeader,
  SearchInput,
  StatusBadge,
  Tabs,
  useToast,
} from '../../components/ui';
import { settle, useAsync } from '../../lib/useAsync';
import { downloadCsv } from '../../lib/csv';
import { formatDate, formatPercent } from '../../lib/format';
import { withFunnel } from '../../lib/metrics';

const STATUS_TABS = ['all', 'running', 'scheduled', 'completed', 'draft'];
const TAB_LABEL = {
  all: 'All',
  running: 'Running',
  scheduled: 'Scheduled',
  completed: 'Completed',
  draft: 'Draft',
};
const CHANNELS = [
  { value: 'all', label: 'All channels' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

function RateCell({ value, label }) {
  return (
    <span className="grid w-24 gap-1">
      <span className="text-xs font-semibold text-ink">{formatPercent(value)}</span>
      <MiniBar value={value} label={label} />
    </span>
  );
}

function CampaignsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('all');
  const [selected, setSelected] = useState([]);
  const [toLaunch, setToLaunch] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useAsync(() =>
    Promise.all([listCampaigns(), settle(getOrganizationAnalytics(), null)]).then(
      ([campaigns, analytics]) => withFunnel(campaigns, analytics?.campaigns),
    ),
  );

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_TABS.map((s) => [s, 0]));
    (data || []).forEach((r) => {
      c.all += 1;
      if (c[r.status] !== undefined) c[r.status] += 1;
    });
    return c;
  }, [data]);

  const rows = useMemo(
    () =>
      (data || [])
        .filter((r) => tab === 'all' || r.status === tab)
        .filter((r) => channel === 'all' || r.type === channel)
        .filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => b.id - a.id),
    [data, tab, channel, query],
  );

  async function duplicate(row) {
    try {
      await createCampaign({
        name: `${row.name} (copy)`,
        type: row.type,
        templateKey: row.templateKey,
        difficultyLevel: row.difficultyLevel,
      });
      toast.success(`Duplicated “${row.name}” as a draft`);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not duplicate campaign');
    }
  }

  async function confirmLaunch() {
    setBusy(true);
    try {
      const { message } = await launchCampaign(toLaunch.id);
      toast.success(message || 'Campaign launched');
      setToLaunch(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not launch campaign');
    } finally {
      setBusy(false);
    }
  }

  function exportSelected() {
    const picked = rows.filter((r) => selected.includes(r.id));
    downloadCsv('redflag-campaigns.csv', picked.length ? picked : rows, [
      { header: 'ID', value: (r) => r.id },
      { header: 'Campaign', value: (r) => r.name },
      { header: 'Channel', value: (r) => r.type },
      { header: 'Status', value: (r) => r.status },
      { header: 'Targets', value: (r) => r.targets },
      { header: 'Opened', value: (r) => r.opened },
      { header: 'Clicked', value: (r) => r.clicked },
      { header: 'Reported', value: (r) => r.reported },
    ]);
  }

  const columns = [
    {
      key: 'name',
      header: 'Campaign',
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="block max-w-[240px]">
          <span className="block truncate font-semibold">{r.name}</span>
          <span className="block text-xs text-ink-3">
            #{r.id} · {formatDate(r.createdAt)}
          </span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Channel',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          {r.type === 'sms' ? (
            <MessageSquare size={15} aria-hidden="true" />
          ) : (
            <Mail size={15} aria-hidden="true" />
          )}
          {r.type === 'sms' ? 'SMS' : 'Email'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: 'targets', header: 'Targets', align: 'right', sortValue: (r) => r.targets },
    {
      key: 'opened',
      header: 'Delivered → Opened',
      sortValue: (r) => r.openRate ?? -1,
      render: (r) => <RateCell value={r.openRate} label={`${r.name} open rate`} />,
    },
    {
      key: 'clicked',
      header: 'Clicked',
      sortValue: (r) => r.clickRate ?? -1,
      render: (r) => <RateCell value={r.clickRate} label={`${r.name} click rate`} />,
    },
    {
      key: 'reported',
      header: 'Reported',
      sortValue: (r) => r.reportRate ?? -1,
      render: (r) => <RateCell value={r.reportRate} label={`${r.name} report rate`} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      stop: true,
      render: (r) => (
        <DropdownButton
          iconOnly
          variant="ghost"
          icon={MoreHorizontal}
          menuLabel={`Actions for ${r.name}`}
          items={[
            {
              label: 'View results',
              icon: Eye,
              onClick: () => navigate(`/admin/campaigns/${r.id}`),
            },
            { label: 'Duplicate', icon: Copy, onClick: () => duplicate(r) },
            ...(['draft', 'scheduled'].includes(r.status)
              ? [{ label: 'Launch now', icon: Rocket, onClick: () => setToLaunch(r) }]
              : []),
            // TODO: replace with API — there is no stop endpoint yet.
            { label: 'Stop', icon: Square, disabled: true, hint: 'Soon', danger: true },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Simulated email and SMS attacks"
        actions={
          <>
            <Button icon={Download} onClick={exportSelected} disabled={!data}>
              {selected.length ? `Export ${selected.length}` : 'Export'}
            </Button>
            <Button as={Link} to="/admin/campaigns/new" variant="primary" icon={Plus}>
              New Campaign
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorCard message={error} onRetry={reload} />
      ) : (
        <Card padded={false} index={0}>
          <div className="px-5 pt-4">
            <Tabs
              label="Filter by status"
              value={tab}
              onChange={setTab}
              tabs={STATUS_TABS.map((s) => ({ value: s, label: TAB_LABEL[s], count: counts[s] }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-5 py-4">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search campaigns…"
              className="w-full sm:w-72"
            />
            <DropdownButton options={CHANNELS} value={channel} onChange={setChannel} />
          </div>
          <DataTable
            caption="Campaigns"
            columns={columns}
            rows={rows}
            loading={loading}
            selectable
            selected={selected}
            onSelect={setSelected}
            onRowClick={(r) => navigate(`/admin/campaigns/${r.id}`)}
            empty={
              <EmptyState
                title={data?.length ? 'No campaigns match these filters' : 'No campaigns yet'}
                description={
                  data?.length
                    ? 'Try another status or search.'
                    : 'Create your first simulated attack.'
                }
                action={
                  !data?.length && (
                    <Button as={Link} to="/admin/campaigns/new" variant="primary" icon={Plus}>
                      New Campaign
                    </Button>
                  )
                }
              />
            }
          />
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(toLaunch)}
        title="Launch campaign now?"
        message={toLaunch ? `“${toLaunch.name}” will be sent to every employee straight away.` : ''}
        confirmLabel="Launch"
        tone="primary"
        loading={busy}
        onConfirm={confirmLaunch}
        onCancel={() => setToLaunch(null)}
      />
    </>
  );
}

export default CampaignsPage;
