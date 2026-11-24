const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');
jest.mock('../src/modules/scoring/scoring.service', () => ({
  ...jest.requireActual('../src/modules/scoring/scoring.service'),
  rescoreAfterEvent: jest.fn().mockResolvedValue(undefined),
}));

const db = require('../src/config/db');
const { rescoreAfterEvent } = require('../src/modules/scoring/scoring.service');
const app = require('../src/app');
const { maybeAssignTraining } = require('../src/modules/training/training.routes');

function token(overrides = {}) {
  return jwt.sign({ sub: 1, role: 'admin', organizationId: 1, email: 'admin@acme.co.ke', ...overrides }, process.env.JWT_SECRET);
}

describe('training modules', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a training module', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Spotting M-Pesa Fraud', category: 'mpesa', quiz: [] }],
    });

    const res = await request(app)
      .post('/api/training/modules')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Spotting M-Pesa Fraud', category: 'mpesa', quiz: [{ question: 'q', options: ['a', 'b'], correctIndex: 0 }] });

    expect(res.statusCode).toBe(201);
  });
});

describe('GET /api/training/assignments', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns only the employee\'s own assignments for an employee role', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'assigned', title: 'Module A' }] });

    const res = await request(app)
      .get('/api/training/assignments')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);

    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('training_assignments.employee_id = $1'), [10]);
  });

  it('never sends the quiz bank to an employee, only how many questions they will get', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, quiz: [{ question: 'Q1', options: ['a', 'b'], correctIndex: 1 }] }],
    });

    const res = await request(app)
      .get('/api/training/assignments')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);

    expect(res.body[0].quizLength).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain('correctIndex');
    expect(JSON.stringify(res.body)).not.toContain('Q1');
  });
});

const bank = Array.from({ length: 9 }, (_, i) => ({
  question: `Q${i + 1}`,
  options: ['a', 'b', 'c'],
  correctIndex: 0,
}));
// A graded bank: three questions at each difficulty, for the adaptive-draw tests.
const graded = [
  ...['e1', 'e2', 'e3'].map((q) => ({ question: q, options: ['a', 'b', 'c'], correctIndex: 0, difficulty: 'easy' })),
  ...['m1', 'm2', 'm3'].map((q) => ({ question: q, options: ['a', 'b', 'c'], correctIndex: 0, difficulty: 'medium' })),
  ...['h1', 'h2', 'h3'].map((q) => ({ question: q, options: ['a', 'b', 'c'], correctIndex: 0, difficulty: 'hard' })),
];
const identity = [0, 1, 2];
const names = (res) => res.body.questions.map((q) => q.question);

describe('POST /api/training/assignments/:id/quiz', () => {
  afterEach(() => jest.clearAllMocks());

  it('draws a retake that avoids the questions the last attempt used', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 10, status: 'failed', quiz: bank, quizServed: null }] })
      .mockResolvedValueOnce({ rows: [{ questions: [0, 1, 2] }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/training/assignments/5/quiz')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);

    expect(res.statusCode).toBe(200);
    // Struggling (prior fail) draws the larger QUIZ_MAX set, all from the six
    // questions the last attempt did not use.
    expect(res.body.questions).toHaveLength(6);
    expect(names(res).sort()).toEqual(['Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9']);
    expect(JSON.stringify(res.body)).not.toContain('correctIndex');
    expect(rescoreAfterEvent).not.toHaveBeenCalled();
  });

  it('gives a confident first-timer a smaller, easier-first set', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 10, status: 'in_progress', quiz: graded, quizServed: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/training/assignments/5/quiz')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);

    expect(res.body.questions).toHaveLength(4);
    // QUIZ_BASE questions, biased to the easier end: no hard questions yet.
    expect(names(res).some((q) => q.startsWith('h'))).toBe(false);
  });

  it('gives a struggling learner a larger, harder-first set', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 10, status: 'failed', quiz: graded, quizServed: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/training/assignments/5/quiz')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);

    expect(res.body.questions).toHaveLength(6);
    // QUIZ_MAX questions, biased to the harder end: the easy ones are dropped.
    expect(names(res).some((q) => q.startsWith('e'))).toBe(false);
  });

  it('will not start the quiz before the lessons are finished', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 5, employeeId: 10, status: 'failed', quiz: bank, lessons: [{}, {}], lessonProgress: 1 }],
    });

    const res = await request(app)
      .post('/api/training/assignments/5/quiz')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);

    expect(res.statusCode).toBe(409);
  });

  it('resumes the attempt in progress instead of redrawing', async () => {
    const quizServed = [{ q: 4, order: identity }];
    db.query.mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 10, status: 'in_progress', quiz: bank, quizServed }] });

    const res = await request(app)
      .post('/api/training/assignments/5/quiz')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);

    expect(res.body.questions).toEqual([{ question: 'Q5', options: ['a', 'b', 'c'] }]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/training/assignments/:id/complete', () => {
  afterEach(() => jest.clearAllMocks());

  // Options shown as [c, a, b], so the right answer ('a') is displayed at index 1.
  const quizServed = [
    { q: 0, order: [2, 0, 1] },
    { q: 1, order: identity },
  ];
  const assignment = { id: 5, employeeId: 10, status: 'in_progress', quiz: bank, quizServed };

  it('marks the assignment completed when the quiz score passes the threshold', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [assignment] })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'completed', completedAt: '2026-01-01' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/training/assignments/5/complete')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`)
      .send({ answers: [1, 0] });

    expect(res.statusCode).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.score).toBe(1);
    expect(res.body.review[0].correctIndex).toBe(1);
    // Completed training is a model feature, so a pass rescores the employee.
    expect(rescoreAfterEvent).toHaveBeenCalledWith(10, 1, null);
  });

  it('records a fail as failed and logs the attempt', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [assignment] })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'failed', completedAt: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/training/assignments/5/complete')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`)
      .send({ answers: [0, 0] });

    expect(res.statusCode).toBe(200);
    expect(res.body.passed).toBe(false);
    expect(res.body.score).toBe(0.5);
    expect(db.query.mock.calls[1][1][0]).toBe('failed');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO training_quiz_attempts'),
      [5, [0, 1], JSON.stringify([0, 0]), 1, 0.5, false, 0, 0],
    );
    // Which answers were wrong is shown, but not what the right ones are.
    expect(res.body.review.map((r) => r.correct)).toEqual([false, true]);
    expect(JSON.stringify(res.body)).not.toContain('correctIndex');
  });

  it('counts lesson misses against a perfect quiz', async () => {
    // One spot lesson with 4 flags and one choice lesson: 5 lesson items.
    const lessons = [
      { type: 'read' },
      { type: 'spot', message: { parts: [{ flag: 'x' }, { flag: 'x' }, { flag: 'x' }, {}] }, senderFlag: 'x' },
      { type: 'choice' },
    ];
    db.query
      .mockResolvedValueOnce({ rows: [{ ...assignment, lessons, lessonProgress: 3, lessonMisses: 5 }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'failed', completedAt: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/training/assignments/5/complete')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`)
      .send({ answers: [1, 0] });

    expect(res.body.quizScore).toBe(1);
    expect(res.body.lessonScore).toBe(0.5);
    // (2 quiz + 5 items x 50%) / 7
    expect(res.body.score).toBeCloseTo(4.5 / 7);
    expect(res.body.passed).toBe(false);
    expect(db.query.mock.calls[1][0]).toContain('lesson_progress = 0');
  });

  it('refuses to grade when no attempt was started', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...assignment, quizServed: null }] });

    const res = await request(app)
      .post('/api/training/assignments/5/complete')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`)
      .send({ answers: [0, 0] });

    expect(res.statusCode).toBe(409);
  });

  it("forbids completing someone else's assignment", async () => {
    db.query.mockResolvedValueOnce({ rows: [assignment] });

    const res = await request(app)
      .post('/api/training/assignments/5/complete')
      .set('Authorization', `Bearer ${token({ sub: 99, role: 'employee' })}`)
      .send({ answers: [0, 1] });

    expect(res.statusCode).toBe(403);
  });
});

describe('maybeAssignTraining', () => {
  afterEach(() => jest.clearAllMocks());

  it('inserts an assignment when a matching training module exists', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 7 }] }).mockResolvedValueOnce({ rows: [] });

    await maybeAssignTraining(1, 10, 'mpesa');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO training_assignments'), [7, 10]);
  });

  it('does nothing when no category is given', async () => {
    await maybeAssignTraining(1, 10, undefined);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('does nothing when no matching module exists', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    await maybeAssignTraining(1, 10, 'unknown-category');
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
