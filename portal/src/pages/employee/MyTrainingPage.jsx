import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { listAssignments } from '../../api/training';
import {
  Button,
  Card,
  EmptyState,
  ErrorCard,
  MiniBar,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPercent } from '../../lib/format';

// Lessons plus the quiz count as steps; completed modules are full.
export function progressOf(a) {
  if (a.status === 'completed') return 1;
  const steps = (a.lessons?.length || 0) + 1;
  return (a.lessonProgress || 0) / steps;
}

function MyTrainingPage() {
  const { data, error, loading, reload } = useAsync(listAssignments);
  const sorted = [...(data || [])].sort(
    (a, b) =>
      (a.status === 'completed') - (b.status === 'completed') ||
      new Date(b.assignedAt) - new Date(a.assignedAt),
  );

  return (
    <>
      <PageHeader title="My Training" subtitle="Short interactive lessons, then a quiz" />
      {error && <ErrorCard message={error} onRetry={reload} />}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      )}
      {data && data.length === 0 && (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No training assigned"
            description="Nice work. Nothing to do right now."
          />
        </Card>
      )}
      {sorted.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((a, i) => (
            <Card key={a.id} index={i} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-label font-semibold text-ink">{a.title}</h2>
                  {a.description && <p className="mt-1 text-body text-ink-2">{a.description}</p>}
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-2 text-xs text-ink-3">
                {a.lessons?.length || 0} lessons · {a.quiz?.length || 0} quiz questions
                {a.estimatedMinutes ? ` · ~${a.estimatedMinutes} min` : ''}
              </p>
              <MiniBar value={progressOf(a)} label={`${a.title} progress`} className="mt-4" />
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-ink-3">
                <span>
                  {a.status === 'completed'
                    ? `Completed ${formatDate(a.completedAt)}${a.lastScore !== null ? ` · ${formatPercent(Number(a.lastScore))}` : ''}`
                    : a.dueAt
                      ? `Due ${formatDate(a.dueAt)}`
                      : `Assigned ${formatDate(a.assignedAt)}`}
                </span>
                <Button
                  as={Link}
                  to={`/portal/training/${a.id}`}
                  size="sm"
                  variant={a.status === 'completed' ? 'outline' : 'primary'}
                  iconRight={ArrowRight}
                >
                  {a.status === 'completed'
                    ? 'Review'
                    : a.status === 'assigned'
                      ? 'Start'
                      : 'Continue'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default MyTrainingPage;
