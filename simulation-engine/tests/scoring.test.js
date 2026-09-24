const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');
jest.mock('axios');

const db = require('../src/config/db');
const axios = require('axios');
const app = require('../src/app');

function token(overrides = {}) {
  return jwt.sign({ sub: 1, role: 'admin', organizationId: 1, email: 'admin@acme.co.ke', ...overrides }, process.env.JWT_SECRET);
}

describe('POST /api/scoring/compute', () => {
  afterEach(() => jest.clearAllMocks());

  it('computes and persists a susceptibility score', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ hireDate: '2024-01-01', department: 'Finance', campaignsSent: 10, opened: 8, clicked: 5, submitted: 2, reported: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 1, employeeId: 10, score: 0.72, riskLevel: 'high', modelVersion: 'v1', computedAt: '2026-01-01' }],
      });
    axios.post.mockResolvedValue({ data: { score: 0.72, risk_level: 'high', model_version: 'v1' } });

    const res = await request(app).post('/api/scoring/compute').set('Authorization', `Bearer ${token()}`).send({ employeeId: 10 });

    expect(res.statusCode).toBe(201);
    expect(res.body.riskLevel).toBe('high');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/predict'),
      expect.objectContaining({ department: 'Finance', campaigns_sent: 10, clicked: 5 }),
    );
  });

  it('returns 404 when the employee does not exist in this org', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/scoring/compute').set('Authorization', `Bearer ${token()}`).send({ employeeId: 999 });
    expect(res.statusCode).toBe(404);
  });

  it('returns 503 when the ML service has no trained model yet', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ hireDate: null, department: null, campaignsSent: 0, opened: 0, clicked: 0, submitted: 0, reported: 0 }],
    });
    axios.post.mockRejectedValue({ response: { status: 503 } });

    const res = await request(app).post('/api/scoring/compute').set('Authorization', `Bearer ${token()}`).send({ employeeId: 10 });
    expect(res.statusCode).toBe(503);
  });
});

describe('GET /api/scoring/employee/:employeeId', () => {
  afterEach(() => jest.clearAllMocks());

  it('lets an employee view their own score', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, employeeId: 10, score: 0.4, riskLevel: 'medium' }] });
    const res = await request(app)
      .get('/api/scoring/employee/10')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);
    expect(res.statusCode).toBe(200);
  });

  it('forbids an employee from viewing someone else\'s score', async () => {
    const res = await request(app)
      .get('/api/scoring/employee/99')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);
    expect(res.statusCode).toBe(403);
  });
});
