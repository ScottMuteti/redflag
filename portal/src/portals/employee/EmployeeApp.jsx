import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CircleCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listAssignments, submitQuiz } from '../../api/training';
import { getEmployeeScore } from '../../api/scoring';
import { Card, Empty, Loading, RiskBadge, StatusBadge } from '../../components/legacy';
import AppShell from '../../components/dashboard/AppShell';
import StatCard from '../../components/dashboard/StatCard';
import TopBar from '../../components/dashboard/TopBar';

/* eslint-disable react/prop-types -- assignment/onSubmitted are plain local props, not worth a PropTypes dependency */
function QuizForm({ assignment, onSubmitted }) {
  const questions = assignment.quiz || [];
  const [answers, setAnswers] = useState(() => new Array(questions.length).fill(-1));
  const [error, setError] = useState('');

  function selectAnswer(questionIndex, optionIndex) {
    setAnswers((prev) => prev.map((value, i) => (i === questionIndex ? optionIndex : value)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const result = await submitQuiz(assignment.id, answers);
      onSubmitted(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit quiz');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quiz-form">
      {questions.map((question, qIndex) => (
        <fieldset key={qIndex}>
          <legend>
            {qIndex + 1}. {question.question}
          </legend>
          {question.options.map((option, optIndex) => (
            <label key={optIndex} className="quiz-option">
              <input
                type="radio"
                name={`assignment-${assignment.id}-q-${qIndex}`}
                checked={answers[qIndex] === optIndex}
                onChange={() => selectAnswer(qIndex, optIndex)}
              />
              {option}
            </label>
          ))}
        </fieldset>
      ))}
      {error && <p className="error">{error}</p>}
      <div>
        <button type="submit" className="btn-primary">
          Submit answers
        </button>
      </div>
    </form>
  );
}
/* eslint-enable react/prop-types */

function EmployeeApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [score, setScore] = useState(null);
  const [openQuizId, setOpenQuizId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const list = await listAssignments();
    setAssignments(list);
    try {
      const latest = await getEmployeeScore(user.id);
      setScore(latest);
    } catch {
      setScore(null);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleQuizSubmitted(assignmentId, result) {
    setFeedback({ assignmentId, ...result });
    setOpenQuizId(null);
    await refresh();
  }

  const pending = assignments.filter((a) => a.status !== 'completed').length;
  const completed = assignments.length - pending;
  const firstName = (user?.fullName || '').split(' ')[0];

  return (
    <AppShell
      topBar={
        <TopBar
          name={firstName || 'there'}
          subtitle="Your security training and risk score"
          actions={
            <button type="button" className="btn-sm" onClick={handleLogout}>
              <LogOut size={16} strokeWidth={1.75} />
              Log out
            </button>
          }
        />
      }
    >
      {loading ? (
        <Loading />
      ) : (
        <div className="stack">
          <div className="d-grid-3">
            <StatCard
              variant="highlight"
              label="Your risk score"
              value={score ? Math.round(score.score * 100) : '—'}
              suffix={score ? '/100' : null}
              index={0}
            />
            <StatCard
              variant="sparkline"
              label="Modules to complete"
              value={pending}
              icon={BookOpen}
              index={1}
            />
            <StatCard
              variant="icon"
              label="Modules completed"
              value={completed}
              icon={CircleCheck}
              index={2}
            />
          </div>

          <Card
            title="Your training"
            subtitle="Assigned after simulated attacks. Pass the quiz to complete each module."
            actions={score && <RiskBadge level={score.riskLevel} />}
          >
            {assignments.length === 0 ? (
              <Empty title="No training assigned">Nice work — nothing to do right now.</Empty>
            ) : (
              <div className="stack">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="assignment">
                    <div className="assignment-head">
                      <div>
                        <h3>{assignment.title}</h3>
                        {assignment.description && <p>{assignment.description}</p>}
                      </div>
                      <div className="assignment-actions">
                        <StatusBadge status={assignment.status} />
                        {assignment.status !== 'completed' && (
                          <button
                            type="button"
                            className={
                              openQuizId === assignment.id ? 'btn-sm' : 'btn-sm btn-primary'
                            }
                            onClick={() =>
                              setOpenQuizId(openQuizId === assignment.id ? null : assignment.id)
                            }
                          >
                            {openQuizId === assignment.id ? 'Close' : 'Start quiz'}
                          </button>
                        )}
                      </div>
                    </div>
                    {feedback?.assignmentId === assignment.id && (
                      <p className={feedback.passed ? 'success' : 'error'}>
                        {feedback.passed ? 'Passed!' : 'Not quite — try again.'} You scored{' '}
                        {Math.round(feedback.score * 100)}%.
                      </p>
                    )}
                    {openQuizId === assignment.id && (
                      <QuizForm
                        assignment={assignment}
                        onSubmitted={(result) => handleQuizSubmitted(assignment.id, result)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}

export default EmployeeApp;
