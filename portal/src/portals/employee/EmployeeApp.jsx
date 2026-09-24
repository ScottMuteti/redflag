import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listAssignments, submitQuiz } from '../../api/training';
import { getEmployeeScore } from '../../api/scoring';
import { Card, Empty, Icon, Loading, Logo, RiskBadge, StatusBadge } from '../../components/ui';

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
  const firstName = (user?.fullName || '').split(' ')[0];

  return (
    <div>
      <header className="topbar">
        <Logo />
        <div className="topbar-user">
          <span>{user?.email}</span>
          <button type="button" className="btn-sm" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      </header>

      {loading ? (
        <Loading />
      ) : (
        <main className="portal-content stack">
          <div className="hero">
            <div>
              <h1>{firstName ? `Hi ${firstName},` : 'Welcome'}</h1>
              <p>
                {pending > 0
                  ? `You have ${pending} training ${pending === 1 ? 'module' : 'modules'} to complete.`
                  : 'You are all caught up on training.'}
              </p>
            </div>
            <div className="hero-score">
              <span className="stat-label" style={{ color: 'var(--ink-text)' }}>
                Your risk score
              </span>
              <div className="stat-value">{score ? `${Math.round(score.score * 100)}%` : '—'}</div>
              {score && <RiskBadge level={score.riskLevel} />}
            </div>
          </div>

          <Card
            title="Your training"
            subtitle="Assigned after simulated attacks. Pass the quiz to complete each module."
          >
            {assignments.length === 0 ? (
              <Empty title="No training assigned">Nice work — nothing to do right now.</Empty>
            ) : (
              <div className="stack">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="card assignment">
                    <div className="assignment-head">
                      <div>
                        <h3>{assignment.title}</h3>
                        {assignment.description && <p>{assignment.description}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
        </main>
      )}
    </div>
  );
}

export default EmployeeApp;
