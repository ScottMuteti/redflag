import { Link } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { listAssignments } from '../../api/training';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorCard,
  PageHeader,
  StatCard,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime, formatPercent } from '../../lib/format';

function QuizzesPage() {
  const { data, error, loading, reload } = useAsync(listAssignments);
  const quizzes = (data || []).filter((a) => a.quiz?.length);
  const passed = quizzes.filter((a) => a.status === 'completed').length;
  const scored = quizzes.filter((a) => a.lastScore !== null);
  const average = scored.length
    ? scored.reduce((sum, a) => sum + Number(a.lastScore), 0) / scored.length
    : null;

  const columns = [
    {
      key: 'title',
      header: 'Module',
      sortValue: (a) => a.title,
      render: (a) => <span className="font-semibold">{a.title}</span>,
    },
    { key: 'questions', header: 'Questions', align: 'right', render: (a) => a.quiz.length },
    {
      key: 'result',
      header: 'Result',
      sortValue: (a) => a.status,
      render: (a) =>
        a.status === 'completed' ? (
          <Badge tone="success">Passed</Badge>
        ) : a.quizAttempts > 0 ? (
          <Badge tone="danger">Not passed yet</Badge>
        ) : (
          <Badge tone="neutral">Not taken</Badge>
        ),
    },
    {
      key: 'lastScore',
      header: 'Last score',
      align: 'right',
      sortValue: (a) => (a.lastScore === null ? -1 : Number(a.lastScore)),
      render: (a) => (a.lastScore === null ? '—' : formatPercent(Number(a.lastScore))),
    },
    { key: 'quizAttempts', header: 'Attempts', align: 'right', sortValue: (a) => a.quizAttempts },
    {
      key: 'lastAttemptAt',
      header: 'Last attempt',
      render: (a) => formatDateTime(a.lastAttemptAt),
    },
    {
      key: 'go',
      header: <span className="sr-only">Open</span>,
      align: 'right',
      render: (a) => (
        <Button as={Link} to={`/portal/training/${a.id}`} size="sm">
          {a.status === 'completed' ? 'Review' : 'Take quiz'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Quizzes" subtitle="Check what you’ve learned. You need 80% to pass." />
      {error && <ErrorCard message={error} onRetry={reload} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard index={0} loading={loading} label="Quizzes" value={quizzes.length} />
        <StatCard index={1} loading={loading} label="Passed" value={passed} />
        <StatCard
          index={2}
          loading={loading}
          label="Average score"
          value={formatPercent(average)}
        />
      </div>
      <Card index={3} padded={false} className="mt-4">
        <DataTable
          caption="My quizzes"
          columns={columns}
          rows={quizzes}
          loading={loading}
          empty={
            <EmptyState
              icon={ListChecks}
              title="No quizzes yet"
              description="Quizzes come with assigned training."
            />
          }
        />
      </Card>
    </>
  );
}

export default QuizzesPage;
