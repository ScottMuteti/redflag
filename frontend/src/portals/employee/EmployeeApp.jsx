import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listAssignments, submitQuiz } from '../../api/training';
import { getEmployeeScore } from '../../api/scoring';

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
          <legend>{question.question}</legend>
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
      <button type="submit">Submit answers</button>
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

  if (loading) return <p>Loading…</p>;

  return (
    <div className="portal">
      <header className="portal-header">
        <h1>RedFlag — {user?.email}</h1>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <main>
        {score && (
          <p>
            Your latest risk score: <strong>{score.riskLevel}</strong> ({Math.round(score.score * 100)}%)
          </p>
        )}
        <h2>Your training assignments</h2>
        {assignments.length === 0 && <p>No training assigned yet.</p>}
        <ul className="assignment-list">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <strong>{assignment.title}</strong> — {assignment.status}
              {assignment.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => setOpenQuizId(openQuizId === assignment.id ? null : assignment.id)}
                >
                  {openQuizId === assignment.id ? 'Close' : 'Start quiz'}
                </button>
              )}
              {feedback?.assignmentId === assignment.id && (
                <p>
                  {feedback.passed ? 'Passed!' : 'Not quite — try again.'} Score: {Math.round(feedback.score * 100)}%
                </p>
              )}
              {openQuizId === assignment.id && (
                <QuizForm assignment={assignment} onSubmitted={(result) => handleQuizSubmitted(assignment.id, result)} />
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default EmployeeApp;
