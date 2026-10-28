/* eslint-disable react/prop-types -- page-local components */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flag,
  Lightbulb,
  ListChecks,
  Mail,
  MessageSquare,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { listAssignments, saveLessonProgress, startQuiz, submitQuiz } from '../../api/training';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorCard,
  MiniBar,
  PageHeader,
  Skeleton,
  useToast,
} from '../../components/ui';
import { cn } from '../../lib/cn';
import { useAsync } from '../../lib/useAsync';

const LESSON_ICON = { read: BookOpen, spot: Search, choice: Lightbulb };

function ReadLesson({ lesson, onReady }) {
  useEffect(() => onReady(true), [onReady]);
  return (
    <div className="grid gap-3">
      {lesson.body.map((p) => (
        <p key={p} className="text-body leading-relaxed text-ink-2">
          {p}
        </p>
      ))}
      {lesson.tips?.length > 0 && (
        <ul className="mt-2 grid gap-2 rounded-card border border-brand-100 bg-brand-50 p-4">
          {lesson.tips.map((t) => (
            <li key={t} className="flex gap-2 text-body text-brand-800">
              <Lightbulb size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Sample message split into parts; tapping a flagged part reveals why it's suspicious.
// Wrong taps, and flags still unfound when "Show me" is used, count as misses.
function SpotLesson({ lesson, onReady, onMiss }) {
  const { message } = lesson;
  const flags = useMemo(
    () => [
      ...message.parts.map((p, i) => (p.flag ? `p${i}` : null)).filter(Boolean),
      ...(lesson.senderFlag ? ['sender'] : []),
    ],
    [message, lesson.senderFlag],
  );
  const [found, setFound] = useState([]);
  const [misses, setMisses] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const done = revealed || found.length === flags.length;
  useEffect(() => onReady(done), [done, onReady]);

  const tap = (id, isFlag) => {
    if (isFlag) setFound((f) => (f.includes(id) ? f : [...f, id]));
    else {
      setMisses((m) => m + 1);
      onMiss(1);
    }
  };
  const reveal = () => {
    onMiss(flags.length - found.length);
    setRevealed(true);
  };
  const shown = (id) => found.includes(id) || revealed;
  const explanations = [
    ...(lesson.senderFlag && shown('sender') ? [lesson.senderFlag] : []),
    ...message.parts.filter((p, i) => p.flag && shown(`p${i}`)).map((p) => p.flag),
  ];

  const Seg = ({ id, flag, children }) => (
    <button
      type="button"
      onClick={() => tap(id, Boolean(flag))}
      className={cn(
        'rounded px-0.5 text-left transition',
        flag && shown(id)
          ? 'bg-danger-bg font-semibold text-danger underline decoration-2'
          : 'hover:bg-brand-50',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="grid gap-4">
      <p className="text-body text-ink-2">{lesson.intro}</p>
      <div className="flex items-center justify-between gap-3 text-xs text-ink-3">
        <span>
          Found <strong className="text-ink">{found.length}</strong> of {flags.length} red flags
          {misses > 0 && ` · ${misses} miss${misses === 1 ? '' : 'es'}`}
        </span>
        {!done && (
          <Button size="sm" variant="ghost" onClick={reveal}>
            Show me
          </Button>
        )}
      </div>
      <div
        className={cn(
          'rounded-card border border-line bg-page p-4',
          message.channel === 'sms' && 'mx-auto w-full max-w-sm',
        )}
      >
        <p className="mb-1 text-micro tracking-wide text-ink-3 uppercase">
          Training example · not a real message
        </p>
        <div className="mb-3 flex items-center gap-2 text-xs text-ink-2">
          {message.channel === 'sms' ? <MessageSquare size={14} /> : <Mail size={14} />}
          <span>From:</span>
          <Seg id="sender" flag={lesson.senderFlag}>
            {message.from}
          </Seg>
        </div>
        {message.subject && (
          <p className="mb-2 text-body font-semibold text-ink">{message.subject}</p>
        )}
        <p className="rounded-card bg-card p-3 text-body leading-relaxed text-ink shadow-card">
          {message.parts.map((p, i) => (
            <Seg key={i} id={`p${i}`} flag={p.flag}>
              {p.text}
            </Seg>
          ))}
        </p>
      </div>
      {explanations.length > 0 && (
        <ul className="grid gap-2">
          {explanations.map((text) => (
            <li key={text} className="flex gap-2 text-body text-ink-2">
              <Flag size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      )}
      {done && !revealed && (
        <p className="flex items-center gap-2 text-body font-semibold text-success">
          <CheckCircle2 size={16} aria-hidden="true" /> You found every red flag.
        </p>
      )}
    </div>
  );
}

function ChoiceLesson({ lesson, onReady, onMiss }) {
  const [picked, setPicked] = useState(null);
  const option = picked === null ? null : lesson.options[picked];
  useEffect(() => onReady(Boolean(option?.correct)), [option, onReady]);

  return (
    <div className="grid gap-3">
      <p className="rounded-card border border-line bg-page p-4 text-body text-ink">
        {lesson.scenario}
      </p>
      {lesson.options.map((o, i) => (
        <button
          key={o.label}
          type="button"
          onClick={() => {
            if (picked !== i && !o.correct) onMiss(1);
            setPicked(i);
          }}
          className={cn(
            'rounded-control border px-3 py-2.5 text-left text-body transition',
            picked === i
              ? o.correct
                ? 'border-2 border-success bg-success-bg'
                : 'border-2 border-danger bg-danger-bg'
              : 'border-line hover:bg-brand-50',
          )}
        >
          {o.label}
        </button>
      ))}
      {option && (
        <p className={cn('flex gap-2 text-body', option.correct ? 'text-success' : 'text-danger')}>
          {option.correct ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span>
            {option.feedback}
            {!option.correct && ' Try another option.'}
          </span>
        </p>
      )}
    </div>
  );
}

// Questions come from the server per attempt: a retake draws a different set.
// The result combines lesson misses and quiz answers.
function Quiz({ assignment, onFinished, onRetake }) {
  const toast = useToast();
  const [questions, setQuestions] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const completed = assignment.status === 'completed';

  const load = useCallback(async () => {
    setQuestions(null);
    setLoadError(null);
    try {
      const res = await startQuiz(assignment.id);
      setQuestions(res.questions);
      setAnswers(res.questions.map(() => -1));
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Could not load the quiz');
    }
  }, [assignment.id]);

  useEffect(() => {
    if (!completed) load();
  }, [completed, load]);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await submitQuiz(assignment.id, answers);
      setResult(res);
      onFinished();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit quiz');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const Icon = result.passed ? CheckCircle2 : XCircle;
    return (
      <div className="grid gap-4">
        <div className="rounded-card border border-line bg-page p-6 text-center">
          <Icon
            size={36}
            className={cn('mx-auto', result.passed ? 'text-success' : 'text-danger')}
            aria-hidden="true"
          />
          <p className="mt-2 text-[40px] leading-none font-extrabold text-ink">
            {Math.round(result.score * 100)}%
          </p>
          <p className="mt-2 text-xs text-ink-3">
            Lessons {Math.round(result.lessonScore * 100)}% ({result.lessonMisses} miss
            {result.lessonMisses === 1 ? '' : 'es'}) · Quiz {Math.round(result.quizScore * 100)}%
          </p>
          <Badge tone={result.passed ? 'success' : 'danger'} className="mt-3">
            {result.passed ? 'Passed, module complete' : 'Failed. You need 80%'}
          </Badge>
          {!result.passed && (
            <p className="mt-3 text-body text-ink-2">
              Recorded as failed. Redo the lessons, then take a new set of questions.
            </p>
          )}
        </div>
        {result.review.map((r) => (
          <div key={r.question} className="rounded-control border border-line p-3 text-body">
            <p className="font-semibold text-ink">{r.question}</p>
            <p
              className={cn(
                'mt-1 flex items-center gap-1.5',
                r.correct ? 'text-success' : 'text-danger',
              )}
            >
              {r.correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {r.correct
                ? 'Correct'
                : r.correctIndex !== undefined
                  ? `Correct answer: ${r.options[r.correctIndex]}`
                  : 'Incorrect. Review the lessons and try again'}
            </p>
          </div>
        ))}
        {result.passed ? (
          <Button as={Link} to="/portal/training" variant="primary" className="justify-self-start">
            Back to my training
          </Button>
        ) : (
          <Button icon={RotateCcw} className="justify-self-start" onClick={onRetake}>
            Redo the lessons
          </Button>
        )}
      </div>
    );
  }

  if (completed) {
    return (
      <div className="rounded-card border border-line bg-page p-6 text-center">
        <CheckCircle2 size={36} className="mx-auto text-success" aria-hidden="true" />
        <p className="mt-2 text-body text-ink-2">
          Passed
          {assignment.lastScore !== null &&
            ` with ${Math.round(Number(assignment.lastScore) * 100)}%`}
          {assignment.quizAttempts > 1 && ` after ${assignment.quizAttempts} attempts`}.
        </p>
      </div>
    );
  }

  if (loadError) return <ErrorCard message={loadError} onRetry={load} />;
  if (!questions) return <Skeleton className="h-60 rounded-card" />;

  return (
    <div className="grid gap-3">
      {questions.map((q, qi) => (
        <fieldset key={q.question} className="rounded-card border border-line p-4">
          <legend className="px-1 text-xs font-semibold text-ink-3">
            Question {qi + 1} of {questions.length}
          </legend>
          <p className="mb-3 text-label font-semibold text-ink">{q.question}</p>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => (
              <label
                key={opt}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-body transition',
                  answers[qi] === oi
                    ? 'border-2 border-brand-700 bg-brand-50'
                    : 'border-line hover:bg-brand-50',
                )}
              >
                <input
                  type="radio"
                  name={`q-${qi}`}
                  checked={answers[qi] === oi}
                  onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                />
                {opt}
              </label>
            ))}
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

function TrainingPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(listAssignments);
  const assignment = data?.find((a) => String(a.id) === id);
  const lessons = assignment?.lessons || [];
  const [step, setStep] = useState(null);
  const [ready, setReady] = useState(false);
  // Misses made since the last saved step; sent with the next progress save.
  const misses = useRef(0);
  const onMiss = useCallback((n) => {
    misses.current += n;
  }, []);

  // Resume where the employee left off; completed modules open on the quiz review.
  useEffect(() => {
    if (assignment && step === null) {
      setStep(
        assignment.status === 'completed'
          ? 0
          : Math.min(assignment.lessonProgress || 0, lessons.length),
      );
    }
  }, [assignment, step, lessons.length]);

  async function next() {
    const nextStep = step + 1;
    setStep(nextStep);
    setReady(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const unsaved = misses.current;
    misses.current = 0;
    try {
      await saveLessonProgress(assignment.id, nextStep, unsaved);
    } catch {
      // Progress saving is best-effort; the lesson flow continues regardless.
    }
  }

  if (error) return <ErrorCard message={error} onRetry={reload} />;
  // Stay mounted while a reload refreshes data, so a quiz result stays on screen.
  if ((loading && !data) || (assignment && step === null))
    return <Skeleton className="h-80 rounded-card" />;
  if (!assignment) {
    return (
      <Card>
        <EmptyState
          title="Module not found"
          description="It may have been removed by your administrator."
          action={<Button onClick={() => navigate('/portal/training')}>Back to my training</Button>}
        />
      </Card>
    );
  }

  const onQuiz = step >= lessons.length;
  const lesson = lessons[step];
  const total = lessons.length + 1;
  const Icon = onQuiz ? ListChecks : LESSON_ICON[lesson.type];

  return (
    <>
      <PageHeader
        title={assignment.title}
        subtitle={assignment.description}
        actions={
          <Button as={Link} to="/portal/training" icon={ArrowLeft}>
            My training
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card index={0} className="h-fit">
          <p className="mb-2 text-xs text-ink-3">
            Step {Math.min(step + 1, total)} of {total}
          </p>
          <MiniBar value={step / total} label="Module progress" className="mb-4" />
          <ol className="grid gap-1">
            {[...lessons.map((l) => l.title), 'Quiz'].map((title, i) => {
              const reachable =
                i <= Math.max(step, assignment.lessonProgress || 0) ||
                assignment.status === 'completed';
              return (
                <li key={title}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => {
                      setStep(i);
                      setReady(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-body transition disabled:opacity-50',
                      i === step
                        ? 'bg-brand-50 font-semibold text-brand-800'
                        : 'text-ink-2 hover:bg-brand-50',
                    )}
                  >
                    {i < step ? (
                      <CheckCircle2
                        size={15}
                        className="shrink-0 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="grid size-[15px] shrink-0 place-items-center text-micro">
                        {i + 1}
                      </span>
                    )}
                    <span className="truncate">{title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card index={1}>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Icon size={18} aria-hidden="true" />
            </span>
            <h2 className="text-label font-semibold text-ink">{onQuiz ? 'Quiz' : lesson.title}</h2>
          </div>

          {onQuiz ? (
            <Quiz
              assignment={assignment}
              onFinished={reload}
              onRetake={() => {
                setStep(0);
                setReady(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
            <>
              {lesson.type === 'read' && (
                <ReadLesson key={step} lesson={lesson} onReady={setReady} />
              )}
              {lesson.type === 'spot' && (
                <SpotLesson key={step} lesson={lesson} onReady={setReady} onMiss={onMiss} />
              )}
              {lesson.type === 'choice' && (
                <ChoiceLesson key={step} lesson={lesson} onReady={setReady} onMiss={onMiss} />
              )}
              <div className="mt-6 flex justify-between gap-2 border-t border-line pt-4">
                <Button
                  icon={ArrowLeft}
                  disabled={step === 0}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </Button>
                <Button variant="primary" iconRight={ArrowRight} disabled={!ready} onClick={next}>
                  {step === lessons.length - 1 ? 'Start quiz' : 'Continue'}
                </Button>
              </div>
            </>
          )}
          {assignment.contentUrl && (
            <a
              href={assignment.contentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-body font-semibold text-brand-700 hover:underline"
            >
              Extra reading
            </a>
          )}
        </Card>
      </div>
    </>
  );
}

export default TrainingPlayerPage;
