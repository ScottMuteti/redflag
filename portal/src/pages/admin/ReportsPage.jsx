import { useState } from 'react';
import { Download, FileSpreadsheet, Flag } from 'lucide-react';
import { getEmployeeAnalytics, getOrganizationAnalytics } from '../../api/analytics';
import { listCampaigns } from '../../api/campaigns';
import { listEmployees } from '../../api/employees';
import { listReports } from '../../api/reports';
import { listAssignments } from '../../api/training';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorCard,
  PageHeader,
  useToast,
} from '../../components/ui';
import { settle, useAsync } from '../../lib/useAsync';
import { downloadCsv } from '../../lib/csv';
import { formatDateTime, toScore } from '../../lib/format';
import { withFunnel } from '../../lib/metrics';

const stamp = () => new Date().toISOString().slice(0, 10);

const EXPORTS = [
  {
    key: 'campaigns',
    title: 'Campaign summary',
    description: 'Targets, opens, clicks and reports per campaign.',
    async run() {
      const [campaigns, analytics] = await Promise.all([
        listCampaigns(),
        getOrganizationAnalytics(),
      ]);
      downloadCsv(`redflag-campaigns-${stamp()}.csv`, withFunnel(campaigns, analytics.campaigns), [
        { header: 'Campaign', value: (r) => r.name },
        { header: 'Channel', value: (r) => r.type },
        { header: 'Status', value: (r) => r.status },
        { header: 'Created', value: (r) => r.createdAt },
        { header: 'Targets', value: (r) => r.targets },
        { header: 'Opened', value: (r) => r.opened },
        { header: 'Clicked', value: (r) => r.clicked },
        { header: 'Submitted', value: (r) => r.submitted },
        { header: 'Reported', value: (r) => r.reported },
      ]);
    },
  },
  {
    key: 'risk',
    title: 'Employee risk register',
    description: 'Latest risk score, simulations and training per employee.',
    async run() {
      const employees = await listEmployees();
      const stats = await Promise.all(
        employees.map((e) => settle(getEmployeeAnalytics(e.id), null)),
      );
      downloadCsv(
        `redflag-risk-register-${stamp()}.csv`,
        employees.map((e, i) => ({ ...e, s: stats[i] })),
        [
          { header: 'Employee', value: (r) => r.fullName },
          { header: 'Email', value: (r) => r.email },
          { header: 'Department', value: (r) => r.departmentName },
          {
            header: 'Risk score (0-100)',
            value: (r) => (r.s?.latestScore ? toScore(Number(r.s.latestScore.score)) : ''),
          },
          { header: 'Risk level', value: (r) => r.s?.latestScore?.riskLevel },
          { header: 'Simulations', value: (r) => r.s?.attempts.total },
          { header: 'Clicked', value: (r) => r.s?.attempts.clicked },
          { header: 'Training done', value: (r) => r.s?.training.completedAssignments },
          { header: 'Training assigned', value: (r) => r.s?.training.totalAssignments },
        ],
      );
    },
  },
  {
    key: 'departments',
    title: 'Department risk',
    description: 'Average risk score per department.',
    async run() {
      const analytics = await getOrganizationAnalytics();
      downloadCsv(`redflag-departments-${stamp()}.csv`, analytics.departments, [
        { header: 'Department', value: (d) => d.department },
        { header: 'Average risk (0-100)', value: (d) => toScore(d.avgScore) },
        { header: 'Employees scored', value: (d) => d.employeeCount },
      ]);
    },
  },
  {
    key: 'training',
    title: 'Training compliance',
    description: 'Every assignment with status, quiz score and due date.',
    async run() {
      const rows = await listAssignments();
      downloadCsv(`redflag-training-${stamp()}.csv`, rows, [
        { header: 'Employee', value: (r) => r.employeeName },
        { header: 'Department', value: (r) => r.departmentName },
        { header: 'Module', value: (r) => r.title },
        { header: 'Status', value: (r) => r.status },
        {
          header: 'Quiz score',
          value: (r) => (r.lastScore === null ? '' : Number(r.lastScore).toFixed(2)),
        },
        { header: 'Assigned', value: (r) => r.assignedAt },
        { header: 'Due', value: (r) => r.dueAt },
        { header: 'Completed', value: (r) => r.completedAt },
      ]);
    },
  },
];

function ReportsPage() {
  const toast = useToast();
  const [running, setRunning] = useState(null);
  const { data, error, loading, reload } = useAsync(listReports);

  async function run(item) {
    setRunning(item.key);
    try {
      await item.run();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setRunning(null);
    }
  }

  const columns = [
    { key: 'employeeName', header: 'Reported by', sortValue: (r) => r.employeeName },
    {
      key: 'channel',
      header: 'Channel',
      render: (r) => <span className="capitalize">{r.channel}</span>,
    },
    {
      key: 'subject',
      header: 'Message',
      render: (r) => (
        <span className="block max-w-[280px]">
          <span className="block truncate font-semibold">{r.subject || r.sender || '—'}</span>
          {r.details && <span className="block truncate text-xs text-ink-3">{r.details}</span>}
        </span>
      ),
    },
    {
      key: 'match',
      header: 'Type',
      render: (r) =>
        r.matchedSimulation ? (
          <Badge tone="success">Simulation · {r.campaignName}</Badge>
        ) : (
          <Badge tone="warning">Possible real threat</Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'When',
      sortValue: (r) => r.createdAt,
      render: (r) => formatDateTime(r.createdAt),
    },
  ];

  return (
    <>
      <PageHeader title="Reports" subtitle="Exports for leadership and audit" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {EXPORTS.map((item, i) => (
          <Card key={item.key} index={i} className="flex flex-col">
            <span className="mb-3 grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700">
              <FileSpreadsheet size={18} aria-hidden="true" />
            </span>
            <h2 className="text-label font-semibold text-ink">{item.title}</h2>
            <p className="mt-1 mb-4 text-body text-ink-3">{item.description}</p>
            <Button
              icon={Download}
              className="mt-auto justify-self-start"
              loading={running === item.key}
              onClick={() => run(item)}
            >
              Download CSV
            </Button>
          </Card>
        ))}
      </div>

      <Card index={4} padded={false} className="mt-4">
        <CardHeader
          className="px-5 pt-5"
          title="Messages flagged by employees"
          subtitle="Reports that don’t match a simulation may be real attacks. Follow them up."
        />
        {error ? (
          <ErrorCard message={error} onRetry={reload} className="m-5" />
        ) : (
          <DataTable
            caption="Flagged messages"
            columns={columns}
            rows={data || []}
            loading={loading}
            empty={
              <EmptyState
                icon={Flag}
                title="No reports yet"
                description="Employees report suspicious messages from their portal."
              />
            }
          />
        )}
      </Card>
    </>
  );
}

export default ReportsPage;
