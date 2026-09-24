const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');

const db = require('../src/config/db');
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
});

describe('POST /api/training/assignments/:id/complete', () => {
  afterEach(() => jest.clearAllMocks());

  const quiz = [
    { question: 'Q1', options: ['a', 'b'], correctIndex: 0 },
    { question: 'Q2', options: ['a', 'b'], correctIndex: 1 },
  ];

  it('marks the assignment completed when the quiz score passes the threshold', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 10, quiz }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'completed', completedAt: '2026-01-01' }] });

    const res = await request(app)
      .post('/api/training/assignments/5/complete')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`)
      .send({ answers: [0, 1] });

    expect(res.statusCode).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.score).toBe(1);
  });

  it('does not mark it completed when the quiz score is below the threshold', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 10, quiz }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'in_progress', completedAt: null }] });

    const res = await request(app)
      .post('/api/training/assignments/5/complete')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`)
      .send({ answers: [1, 1] });

    expect(res.statusCode).toBe(200);
    expect(res.body.passed).toBe(false);
    expect(res.body.score).toBe(0.5);
  });

  it('forbids completing someone else\'s assignment', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 10, quiz }] });

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
