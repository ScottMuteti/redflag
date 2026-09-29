import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEmployeeAnalytics } from '../../api/analytics';
import { listAssignments } from '../../api/training';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorCard,
  PageHeader,
  ProgressRow,
  RiskPill,
  StatCard,
  StatusBadge,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatDate, toScore } from '../../lib/format';
import { rate } from '../../lib/metrics';

function EmployeeOverviewPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(() =>
    Promise.all([getEmployeeAnalytics(user.id), listAssignments()]).then(
      ([stats, assignments]) => ({
        stats,
        assignments,
      }),
    ),
  );

  if (error) {
    return (
      <>
        <PageHeader title="Overview" subtitle="Your score and training" />
        <ErrorCard message={error} onRetry={reload} />
      </>
    );
  }

  const score = data?.stats.latestScore ? toScore(Number(data.stats.latestScore.score)) : null;
  const attempts = data?.stats.attempts || { total: 0, clicked: 0 };
  const training = data?.stats.training || { totalAssignments: 0, completedAssignments: 0 };
  const pending = (data?.assignments || []).filter((a) => a.status !== 'completed');

  return (
    <>
      <PageHeader title="Overview" subtitle="Your security score and training at a glance" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          index={0}
          loading={loading}
          label="My Risk Score"
          period={
            data?.stats.latestScore ? formatDate(data.stats.latestScore.computedAt) : undefined
          }
          value={score ?? '—'}
          suffix={score !== null ? '/100' : undefined}
        />
        <StatCard index={1} loading={loading} label="Simulations received" value={attempts.total} />
        <StatCard index={2} loading={loading} label="Times clicked" value={attempts.clicked} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card index={3} className="lg:col-span-2">
          <CardHeader
            title="Training to do"
            action={
              <Link
                to="/portal/training"
                className="text-xs font-bold text-brand-700 hover:underline"
              >
                See All
              </Link>
            }
          />
          {!loading && pending.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="You’re all caught up"
              description="No training is waiting for you."
            />
          ) : (
            <ul className="grid gap-3">
              {pending.slice(0, 4).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-control border border-line p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{a.title}</span>
                    <span className="block text-xs text-ink-3">
                      {a.dueAt
                        ? `Due ${formatDate(a.dueAt)}`
                        : `Assigned ${formatDate(a.assignedAt)}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    <Button
                      as={Link}
                      to="/portal/training"
                      size="sm"
                      variant="primary"
                      iconRight={ArrowRight}
                    >
                      Continue
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card index={4}>
          <CardHeader title="My progress" />
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="text-body text-ink-2">Risk level</span>
              <RiskPill level={data?.stats.latestScore?.riskLevel} />
            </div>
            <ProgressRow
              label="Training completed"
              value={rate(training.completedAssignments, training.totalAssignments)}
              detail={`${training.completedAssignments}/${training.totalAssignments}`}
            />
            <p className="text-xs text-ink-3">
              Completing training and reporting suspicious messages lowers your risk score over
              time.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

export default EmployeeOverviewPage;
