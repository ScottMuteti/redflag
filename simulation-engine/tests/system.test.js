const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');
jest.mock('../src/integrations/mail/mailer', () => ({
  sendOtpEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendInviteEmail: jest.fn().mockResolvedValue({ delivered: true }),
  sendAccessDeclinedEmail: jest.fn().mockResolvedValue({ delivered: true }),
}));

const db = require('../src/config/db');
const { sendInviteEmail, sendAccessDeclinedEmail } = require('../src/integrations/mail/mailer');
const app = require('../src/app');

const tokenFor = (claims) => `Bearer ${jwt.sign(claims, process.env.JWT_SECRET)}`;
const SYSTEM = tokenFor({ sub: 1, role: 'system_admin', organizationId: null, email: 'ops@redflag.test' });
const ORG_ADMIN = tokenFor({ sub: 5, role: 'admin', organizationId: 1, email: 'jane@acme.co.ke' });

function mockClient() {
  const client = { query: jest.fn(), release: jest.fn() };
  db.getClient.mockResolvedValue(client);
  return client;
}

describe('/api/system', () => {
  afterEach(() => jest.clearAllMocks());

  it('is closed to organisation admins', async () => {
    const res = await request(app).get('/api/system/organizations').set('Authorization', ORG_ADMIN);
    expect(res.statusCode).toBe(403);
  });

  it('lists organisations for a system admin', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Acme', employeeCount: 12 }] });
    const res = await request(app).get('/api/system/organizations').set('Authorization', SYSTEM);
    expect(res.statusCode).toBe(200);
    expect(res.body[0].name).toBe('Acme');
  });

  it('onboards an organisation and invites its admin', async () => {
    const client = mockClient();
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 3, name: 'Kilimo Sacco' }] }) // insert org
      .mockResolvedValueOnce({ rows: [{ id: 8, fullName: 'Ann Admin', email: 'ann@kilimo.co.ke', role: 'admin' }] }) // insert admin
      .mockResolvedValue({ rows: [] }); // reset link, starter modules, COMMIT

    const res = await request(app)
      .post('/api/system/organizations')
      .set('Authorization', SYSTEM)
      .send({ name: 'Kilimo Sacco', adminFullName: 'Ann Admin', adminEmail: 'ann@kilimo.co.ke' });

    expect(res.statusCode).toBe(201);
    expect(res.body.admin.email).toBe('ann@kilimo.co.ke');
    expect(sendInviteEmail).toHaveBeenCalledWith(
      'ann@kilimo.co.ke',
      'Kilimo Sacco',
      expect.stringMatching(/\/reset-password\?token=/),
    );
  });

  it('rejects onboarding without a valid admin email', async () => {
    const res = await request(app)
      .post('/api/system/organizations')
      .set('Authorization', SYSTEM)
      .send({ name: 'Kilimo Sacco', adminFullName: 'Ann Admin', adminEmail: 'not-an-email' });
    expect(res.statusCode).toBe(400);
  });

  it('suspends an organisation', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, suspendedAt: new Date().toISOString() }] });
    const res = await request(app).post('/api/system/organizations/1/suspend').set('Authorization', SYSTEM);
    expect(res.statusCode).toBe(200);
    expect(res.body.suspendedAt).toEqual(expect.any(String));
  });

  it('refuses to delete a global template that upcoming campaigns use', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ n: 2 }] });
    const res = await request(app).delete('/api/system/templates/mpesa-alert').set('Authorization', SYSTEM);
    expect(res.statusCode).toBe(409);
  });

  it('only edits global templates', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put('/api/system/templates/missing')
      .set('Authorization', SYSTEM)
      .send({ body: 'Updated body' });
    expect(res.statusCode).toBe(404);
    expect(db.query.mock.calls[0][0]).toMatch(/organization_id IS NULL/);
  });
});

describe('/api/system/access-requests', () => {
  afterEach(() => jest.clearAllMocks());

  it('approving onboards the org and invites the contact', async () => {
    const client = mockClient();
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 4, organization_name: 'Kilimo Sacco', contact_name: 'Ann Wambui', contact_email: 'ann@kilimo.co.ke' }],
      }) // lock request
      .mockResolvedValueOnce({ rows: [{ id: 3, name: 'Kilimo Sacco' }] }) // insert org
      .mockResolvedValueOnce({ rows: [{ id: 8, email: 'ann@kilimo.co.ke', role: 'admin' }] }) // insert admin
      .mockResolvedValue({ rows: [] }); // reset link, starter modules, mark approved, COMMIT

    const res = await request(app).post('/api/system/access-requests/4/approve').set('Authorization', SYSTEM);

    expect(res.statusCode).toBe(201);
    expect(sendInviteEmail).toHaveBeenCalledWith('ann@kilimo.co.ke', 'Kilimo Sacco', expect.any(String));
    expect(client.query.mock.calls.some(([sql]) => /SET status = 'approved'/.test(sql))).toBe(true);
  });

  it('approving an already-reviewed request is a 404', async () => {
    const client = mockClient();
    client.query.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/system/access-requests/4/approve').set('Authorization', SYSTEM);
    expect(res.statusCode).toBe(404);
  });

  it('declining emails the contact', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ contact_email: 'ann@kilimo.co.ke', organization_name: 'Kilimo Sacco' }] });
    const res = await request(app).post('/api/system/access-requests/4/decline').set('Authorization', SYSTEM);
    expect(res.statusCode).toBe(204);
    expect(sendAccessDeclinedEmail).toHaveBeenCalledWith('ann@kilimo.co.ke', 'Kilimo Sacco');
  });
});

describe('campaign send window', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a send window over 24 hours', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', ORG_ADMIN)
      .send({ name: 'Drill', type: 'sms', templateKey: 'mpesa-alert', sendWindowMinutes: 5000 });
    expect(res.statusCode).toBe(400);
  });

  it('stores the send window on a new campaign', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 4, sendWindowMinutes: 60 }] });
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', ORG_ADMIN)
      .send({ name: 'Drill', type: 'sms', templateKey: 'mpesa-alert', sendWindowMinutes: 60 });
    expect(res.statusCode).toBe(201);
    expect(db.query.mock.calls[0][1]).toContain(60);
  });
});
