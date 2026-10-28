const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');

const db = require('../src/config/db');
const app = require('../src/app');

function token(overrides = {}) {
  return jwt.sign(
    { sub: 7, role: 'employee', organizationId: 1, email: 'emp@acme.co.ke', ...overrides },
    process.env.JWT_SECRET,
  );
}

describe('reports routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('matches a report to a recent simulation and marks it reported', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 33, campaignName: 'KRA drill' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, channel: 'email' }] });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token()}`)
      .send({ channel: 'email', sender: 'x@kra-notices.com' });

    expect(res.statusCode).toBe(201);
    expect(res.body.matchedSimulation).toBe(true);
    expect(db.query.mock.calls[1][0]).toContain('SET reported_at = now()');
  });

  it('rejects an empty report', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token()}`)
      .send({ channel: 'sms' });
    expect(res.statusCode).toBe(400);
  });

  it('only lets employees file reports', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token({ role: 'admin' })}`)
      .send({ channel: 'sms', details: 'x' });
    expect(res.statusCode).toBe(403);
  });
});

describe('training progress and campaign stop', () => {
  afterEach(() => jest.clearAllMocks());

  it('records lesson progress for the employee who owns the assignment', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 7, status: 'assigned', lessons: [{}, {}, {}] }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'in_progress', lessonProgress: 2 }] });

    const res = await request(app)
      .post('/api/training/assignments/5/progress')
      .set('Authorization', `Bearer ${token()}`)
      .send({ lessonProgress: 2, misses: 3 });

    expect(res.statusCode).toBe(200);
    expect(db.query.mock.calls[1][0]).toContain('lesson_misses = lesson_misses + $3');
    expect(db.query.mock.calls[1][1]).toEqual([2, 3, 3, 5]);
  });

  it('blocks progress on another employee’s assignment', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 5, employeeId: 99, lessons: [] }] });
    const res = await request(app)
      .post('/api/training/assignments/5/progress')
      .set('Authorization', `Bearer ${token()}`)
      .send({ lessonProgress: 1 });
    expect(res.statusCode).toBe(403);
  });

  it('stops a running SMS campaign', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 2, type: 'sms', status: 'running' }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, status: 'completed' }] });

    const res = await request(app)
      .post('/api/campaigns/2/stop')
      .set('Authorization', `Bearer ${token({ role: 'admin', sub: 1 })}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('refuses to delete a launched campaign', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ status: 'running' }] });
    const res = await request(app)
      .delete('/api/campaigns/2')
      .set('Authorization', `Bearer ${token({ role: 'admin', sub: 1 })}`);
    expect(res.statusCode).toBe(409);
  });
});
