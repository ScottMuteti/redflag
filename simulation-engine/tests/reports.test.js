const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set before the app (and env.js) are required, so the inbound webhook is enabled.
process.env.REPORT_INBOUND_SECRET = 'test-secret';
process.env.REPORT_INBOX = 'phishing@acme.co.ke';
process.env.REPORT_SMS_NUMBER = '+254700111222';

jest.mock('../src/config/db');

const db = require('../src/config/db');
const app = require('../src/app');

// Route report-flow queries (match, recordEvent transaction, insert) by SQL.
function mockReportFlow({ match = true, employee = null } = {}) {
  db.getClient.mockResolvedValue({ query: (...a) => db.query(...a), release: jest.fn() });
  db.query.mockImplementation((sql) => {
    if (sql.includes('FROM simulation_attempts') && sql.includes('simulation_campaigns.type = $2')) {
      return Promise.resolve({
        rows: match ? [{ id: 33, campaignId: 9, campaignName: 'KRA drill' }] : [],
      });
    }
    if (sql.includes('FROM employees WHERE lower(email)') || sql.includes('regexp_replace(phone_number')) {
      return Promise.resolve({ rows: employee ? [employee] : [] });
    }
    if (sql.includes('LEFT JOIN campaign_templates')) {
      return Promise.resolve({ rows: [{ organizationId: 1, category: 'kra' }] });
    }
    if (sql.includes('UPDATE simulation_attempts SET reported_at')) {
      return Promise.resolve({ rowCount: 1 });
    }
    if (sql.includes('INSERT INTO phishing_reports')) {
      return Promise.resolve({ rows: [{ id: 1, channel: 'email', status: 'new' }] });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

function token(overrides = {}) {
  return jwt.sign(
    { sub: 7, role: 'employee', organizationId: 1, email: 'emp@acme.co.ke', ...overrides },
    process.env.JWT_SECRET,
  );
}

describe('reports routes', () => {
  afterEach(() => jest.clearAllMocks());

  it('matches a report to a recent simulation and records it via recordEvent', async () => {
    mockReportFlow({ match: true });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token()}`)
      .send({ channel: 'email', sender: 'x@kra-notices.com' });

    expect(res.statusCode).toBe(201);
    expect(res.body.matchedSimulation).toBe(true);
    // The match is credited through the shared event path (so the employee is
    // rescored and the live dashboard updates), not a bare direct update.
    const sqls = db.query.mock.calls.map(([sql]) => sql);
    expect(sqls.some((s) => s.includes('UPDATE simulation_attempts SET reported_at'))).toBe(true);
    expect(sqls.some((s) => s.includes('INSERT INTO phishing_reports'))).toBe(true);
  });

  it('matches an SMS report to a recent SMS simulation', async () => {
    mockReportFlow({ match: true });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token()}`)
      .send({ channel: 'sms', sender: 'MPESA', details: 'won a prize, suspicious link' });

    expect(res.statusCode).toBe(201);
    expect(res.body.matchedSimulation).toBe(true);
    // The simulation lookup ran against the SMS channel.
    const match = db.query.mock.calls.find(([sql]) => sql.includes('simulation_campaigns.type = $2'));
    expect(match[1][1]).toBe('sms');
  });

  it('stores an unmatched report without crediting a simulation', async () => {
    mockReportFlow({ match: false });

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token()}`)
      .send({ channel: 'email', sender: 'real-attacker@evil.example' });

    expect(res.statusCode).toBe(201);
    expect(res.body.matchedSimulation).toBe(false);
    const sqls = db.query.mock.calls.map(([sql]) => sql);
    expect(sqls.some((s) => s.includes('UPDATE simulation_attempts SET reported_at'))).toBe(false);
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

  it('exposes the dedicated reporting address', async () => {
    const res = await request(app).get('/api/reports/info').set('Authorization', `Bearer ${token()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.reportEmail).toBe('phishing@acme.co.ke');
    expect(res.body.reportSms).toBe('+254700111222');
  });
});

describe('reports triage (admin)', () => {
  afterEach(() => jest.clearAllMocks());

  it('updates a report status', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 5, status: 'reviewed', reviewedAt: '2026-11-04' }] });
    const res = await request(app)
      .patch('/api/reports/5')
      .set('Authorization', `Bearer ${token({ role: 'admin', sub: 1 })}`)
      .send({ status: 'reviewed' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('reviewed');
  });

  it('rejects an invalid status', async () => {
    const res = await request(app)
      .patch('/api/reports/5')
      .set('Authorization', `Bearer ${token({ role: 'admin', sub: 1 })}`)
      .send({ status: 'archived' });
    expect(res.statusCode).toBe(400);
  });

  it('forbids an employee from triaging', async () => {
    const res = await request(app)
      .patch('/api/reports/5')
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'resolved' });
    expect(res.statusCode).toBe(403);
  });
});

describe('reports inbound webhook', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a wrong or missing secret', async () => {
    const res = await request(app)
      .post('/api/reports/inbound')
      .set('x-report-secret', 'wrong')
      .send({ reporterEmail: 'emp@acme.co.ke' });
    expect(res.statusCode).toBe(401);
  });

  it('creates a report from a forwarded email and matches a simulation', async () => {
    mockReportFlow({ match: true, employee: { id: 7, organizationId: 1 } });
    const res = await request(app)
      .post('/api/reports/inbound')
      .set('x-report-secret', 'test-secret')
      .send({ reporterEmail: 'emp@acme.co.ke', from: 'x@kra-notices.com', subject: 'Penalty', text: 'pay now' });
    expect(res.statusCode).toBe(201);
    expect(res.body.matchedSimulation).toBe(true);
  });

  it('accepts and ignores an unknown reporter', async () => {
    mockReportFlow({ match: false, employee: null });
    const res = await request(app)
      .post('/api/reports/inbound')
      .set('x-report-secret', 'test-secret')
      .send({ reporterEmail: 'stranger@nowhere.example' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ignored');
  });

  it('creates an SMS report from a text forwarded by phone number', async () => {
    mockReportFlow({ match: true, employee: { id: 7, organizationId: 1 } });
    const res = await request(app)
      .post('/api/reports/inbound')
      .set('x-report-secret', 'test-secret')
      .send({ reporterPhone: '+254711111111', text: 'MPESA: you won, click http://x' });

    expect(res.statusCode).toBe(201);
    expect(res.body.matchedSimulation).toBe(true);
    // The matched attempt was found via the SMS branch and the report stored as SMS.
    const insert = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO phishing_reports'));
    expect(insert[1][3]).toBe('sms'); // channel param
  });

  it('requires an email or phone to identify the reporter', async () => {
    const res = await request(app)
      .post('/api/reports/inbound')
      .set('x-report-secret', 'test-secret')
      .send({ text: 'no reporter here' });
    expect(res.statusCode).toBe(400);
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
