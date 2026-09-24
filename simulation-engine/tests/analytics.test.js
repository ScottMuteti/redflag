const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');

const db = require('../src/config/db');
const app = require('../src/app');

function token(overrides = {}) {
  return jwt.sign({ sub: 1, role: 'admin', organizationId: 1, email: 'admin@acme.co.ke', ...overrides }, process.env.JWT_SECRET);
}

describe('GET /api/analytics/organization', () => {
  afterEach(() => jest.clearAllMocks());

  it('aggregates risk score, department, campaign, and training stats', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ riskScore: '0.42' }] })
      .mockResolvedValueOnce({ rows: [{ department: 'Finance', avgScore: '0.5', employeeCount: '3' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Safaricom Drill', totalAttempts: '5', opened: '4', clicked: '2', submitted: '1', reported: '1' }] })
      .mockResolvedValueOnce({ rows: [{ total: '10', completed: '4' }] })
      .mockResolvedValueOnce({ rows: [{ week: '2026-09-14T00:00:00Z', value: '0.5' }] })
      .mockResolvedValueOnce({ rows: [{ week: '2026-09-14T00:00:00Z', value: 0.4 }, { week: '2026-09-21T00:00:00Z', value: 0.2 }] });

    const res = await request(app).get('/api/analytics/organization').set('Authorization', `Bearer ${token()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.riskLevel).toBe('medium');
    expect(res.body.departments[0]).toEqual({ department: 'Finance', avgScore: 0.5, employeeCount: 3 });
    expect(res.body.training).toEqual({ totalAssignments: 10, completedAssignments: 4, completionRate: 0.4 });
    expect(res.body.trend).toEqual([
      { week: '2026-09-14', avgRisk: 0.5, clickRate: 0.4 },
      { week: '2026-09-21', avgRisk: null, clickRate: 0.2 },
    ]);
  });
});

describe('GET /api/analytics/employee/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('forbids an employee from viewing another employee\'s analytics', async () => {
    const res = await request(app)
      .get('/api/analytics/employee/5')
      .set('Authorization', `Bearer ${token({ sub: 10, role: 'employee' })}`);
    expect(res.statusCode).toBe(403);
  });
});
