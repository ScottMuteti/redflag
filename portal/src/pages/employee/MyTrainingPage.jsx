/* eslint-disable react/prop-types -- page-local components */
import { useState } from 'react';
import { CheckCircle2, GraduationCap, XCircle } from 'lucide-react';
import { listAssignments, submitQuiz } from '../../api/training';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorCard,
  MiniBar,
  PageHeader,
  Skeleton,
  StatusBadge,
  useToast,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import { useAsync } from '../../lib/useAsync';
import { formatDate } from '../../lib/format';

const PROGRESS = { assigned: 0, in_progress: 0.5, completed: 1 };

// One question per card; options are full-width rows that highlight when chosen.
function Quiz({ assignment, onDone }) {
  const toast = useToast();
  const questions = assignment.quiz || [];
  const [answers, setAnswers] = useState(() => questions.map(() => -1));
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await submitQuiz(assignment.id, answers);
      setResult(res);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit quiz');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const Icon = result.passed ? CheckCircle2 : XCircle;
    return (
      <div className="rounded-card border border-line bg-page p-6 text-center">
        <Icon
          size={32}
          className={cn('mx-auto', result.passed ? 'text-success' : 'text-danger')}
          aria-hidden="true"
        />
        <p className="mt-2 text-[40px] leading-none font-extrabold text-ink">
          {Math.round(result.score * 100)}%
        </p>
        <Badge tone={result.passed ? 'success' : 'danger'} className="mt-3">
          {result.passed ? 'Passed' : 'Not passed, try again'}
        </Badge>
        {!result.passed && (
          <div className="mt-4">
            <Button
              onClick={() => {
                setResult(null);
                setAnswers(questions.map(() => -1));
              }}
            >
              Retake quiz
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {questions.map((q, qi) => (
        <fieldset key={qi} className="rounded-card border border-line p-4">
          <legend className="px-1 text-xs font-semibold text-ink-3">
            Question {qi + 1} of {questions.length}
          </legend>
          <p className="mb-3 text-label font-semibold text-ink">{q.question}</p>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => {
              const chosen = answers[qi] === oi;
              return (
                <label
                  key={oi}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-body transition',
                    chosen
                      ? 'border-2 border-brand-700 bg-brand-50'
                      : 'border-line hover:bg-brand-50',
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${assignment.id}-${qi}`}
                    checked={chosen}
                    onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <Button
        variant="primary"
        className="justify-self-start"
        loading={submitting}
        disabled={questions.length > 0 && answers.includes(-1)}
        onClick={submit}
      >
        {questions.length ? 'Submit answers' : 'Mark as complete'}
      </Button>
    </div>
  );
}

function MyTrainingPage() {
  const { data, error, loading, reload } = useAsync(listAssignments);
  const [openId, setOpenId] = useState(null);

  return (
    <>
      <PageHeader title="My Training" subtitle="Modules assigned to you after simulations" />
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
      {data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((a, i) => (
            <Card key={a.id} index={i} className={cn(openId === a.id && 'md:col-span-2')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-label font-semibold text-ink">{a.title}</h2>
                  {a.description && <p className="mt-1 text-body text-ink-2">{a.description}</p>}
                </div>
                <StatusBadge status={a.status} />
              </div>
              <MiniBar
                value={PROGRESS[a.status] ?? 0}
                label={`${a.title} progress`}
                className="mt-4"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                <span>
                  {a.dueAt ? `Due ${formatDate(a.dueAt)}` : `Assigned ${formatDate(a.assignedAt)}`}
                </span>
                {a.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant={openId === a.id ? 'outline' : 'primary'}
                    onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  >
                    {openId === a.id ? 'Close' : 'Continue'}
                  </Button>
                )}
              </div>
              {a.contentUrl && openId === a.id && (
                <a
                  href={a.contentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-body font-semibold text-brand-700 hover:underline"
                >
                  Open the learning material
                </a>
              )}
              {openId === a.id && (
                <div className="mt-4">
                  <Quiz assignment={a} onDone={reload} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default MyTrainingPage;
