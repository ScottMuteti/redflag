const request = require('supertest');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');
jest.mock('../src/integrations/gophish/gophishClient');
jest.mock('../src/integrations/africasTalking/smsClient');

const db = require('../src/config/db');
const gophishClient = require('../src/integrations/gophish/gophishClient');
const smsClient = require('../src/integrations/africasTalking/smsClient');
const app = require('../src/app');

function adminToken() {
  return jwt.sign({ sub: 1, role: 'admin', organizationId: 1, email: 'admin@acme.co.ke' }, process.env.JWT_SECRET);
}

function mockQueries(handlers) {
  db.query.mockImplementation((sql, params) => {
    for (const [match, respond] of handlers) {
      if (sql.includes(match)) return Promise.resolve(respond(params));
    }
    return Promise.resolve({ rows: [] });
  });
}

// Transactions use db.getClient(); route their queries through the same mock.
function mockClient() {
  db.getClient.mockResolvedValue({ query: (...args) => db.query(...args), release: jest.fn() });
}

describe('campaigns routes', () => {
  const token = adminToken();
  afterEach(() => jest.clearAllMocks());

  it('creates a draft campaign', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Mpesa Drill', type: 'sms', templateKey: 'mpesa-alert', difficultyLevel: 'medium', status: 'draft' }],
    });

    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mpesa Drill', type: 'sms', templateKey: 'mpesa-alert' });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('draft');
  });

  it('rejects an unsupported campaign type', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad', type: 'fax', templateKey: 'x' });
    expect(res.statusCode).toBe(400);
  });

  it('launches an email campaign via the Gophish client', async () => {
    const campaign = { id: 1, name: 'Safaricom Drill', type: 'email', templateKey: 'safaricom-impersonation', status: 'launching' };
    const template = { type: 'email', subject: 'Verify now', body: '<a href="{{.URL}}">verify</a>' };
    const employees = [{ id: 10, fullName: 'Employee One', email: 'emp1@acme.co.ke', phoneNumber: null, jobTitle: 'Analyst' }];

    mockQueries([
      ["SET status = 'launching'", () => ({ rows: [campaign] })],
      ['FROM campaign_templates', () => ({ rows: [template] })],
      ['FROM employees WHERE organization_id', () => ({ rows: employees })],
      ['UPDATE simulation_campaigns', () => ({ rowCount: 1 })],
      ['INSERT INTO simulation_attempts', () => ({ rows: [] })],
    ]);
    gophishClient.createGroup.mockImplementation((name) => Promise.resolve({ id: 1, name }));
    gophishClient.createTemplate.mockImplementation((name) => Promise.resolve({ id: 2, name }));
    gophishClient.createCampaign.mockResolvedValue({ id: 55 });

    const res = await request(app)
      .post('/api/campaigns/1/launch')
      .set('Authorization', `Bearer ${token}`)
      .send({ acknowledgeAuthorisation: true });

    expect(res.statusCode).toBe(200);
    expect(gophishClient.createGroup).toHaveBeenCalledWith(expect.stringMatching(/^redflag-1-/), employees);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('authorised_by = $1'), [1, 1]);
    expect(smsClient.sendSms).not.toHaveBeenCalled();
  });

  it('launches an SMS campaign with a per-employee tracking link', async () => {
    const campaign = { id: 2, name: 'Mpesa SMS Drill', type: 'sms', templateKey: 'mpesa-alert', status: 'launching' };
    const template = { type: 'sms', subject: null, body: 'M-PESA alert: {{link}}' };
    const employees = [{ id: 20, fullName: 'Employee Two', email: 'emp2@acme.co.ke', phoneNumber: '+254711111111', jobTitle: null }];

    mockQueries([
      ["SET status = 'launching'", () => ({ rows: [campaign] })],
      ['FROM campaign_templates', () => ({ rows: [template] })],
      ['FROM employees WHERE organization_id', () => ({ rows: employees })],
      ['INSERT INTO simulation_attempts', () => ({ rows: [{ trackingToken: 'tok-123' }] })],
      ['UPDATE simulation_campaigns', () => ({ rowCount: 1 })],
    ]);

    const res = await request(app)
      .post('/api/campaigns/2/launch')
      .set('Authorization', `Bearer ${token}`)
      .send({ acknowledgeAuthorisation: true });

    expect(res.statusCode).toBe(200);
    expect(smsClient.sendSms).toHaveBeenCalledWith(
      '+254711111111',
      expect.stringContaining('/api/campaigns/track/tok-123'),
    );
    expect(gophishClient.createGroup).not.toHaveBeenCalled();
  });

  it('blocks launch without the authorisation acknowledgement', async () => {
    const res = await request(app).post('/api/campaigns/1/launch').set('Authorization', `Bearer ${token}`).send({});
    expect(res.statusCode).toBe(422);
    expect(db.query).not.toHaveBeenCalled();
    expect(gophishClient.createGroup).not.toHaveBeenCalled();
  });

  it('refuses to launch a campaign already launching or running (double-click)', async () => {
    mockQueries([
      ["SET status = 'launching'", () => ({ rows: [] })],
      ['SELECT status FROM simulation_campaigns', () => ({ rows: [{ status: 'launching' }] })],
    ]);

    const res = await request(app)
      .post('/api/campaigns/3/launch')
      .set('Authorization', `Bearer ${token}`)
      .send({ acknowledgeAuthorisation: true });
    expect(res.statusCode).toBe(409);
  });

  it('marks the campaign failed with a reason when Gophish is unreachable', async () => {
    const campaign = { id: 5, name: 'X', type: 'email', templateKey: 'kra-notice', status: 'launching' };
    mockQueries([
      ["SET status = 'launching'", () => ({ rows: [campaign] })],
      ['FROM campaign_templates', () => ({ rows: [{ type: 'email', subject: 's', body: 'b' }] })],
      ['FROM employees WHERE organization_id', () => ({ rows: [{ id: 1, fullName: 'A B', email: 'a@x.co.ke' }] })],
    ]);
    gophishClient.createGroup.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const res = await request(app)
      .post('/api/campaigns/5/launch')
      .set('Authorization', `Bearer ${token}`)
      .send({ acknowledgeAuthorisation: true });

    expect(res.statusCode).toBe(502);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("status = 'failed'"), [
      5,
      expect.stringContaining('Gophish is not reachable'),
    ]);
  });

  it('requires the authorisation acknowledgement to schedule', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Later', type: 'sms', templateKey: 'mpesa-alert', scheduledAt: '2026-10-01T09:00:00Z' });
    expect(res.statusCode).toBe(422);
  });

  it('creates a scheduled campaign and records who authorised it', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 4, status: 'scheduled' }] });

    const res = await request(app).post('/api/campaigns').set('Authorization', `Bearer ${token}`).send({
      name: 'Later',
      type: 'sms',
      templateKey: 'mpesa-alert',
      scheduledAt: '2026-10-01T09:00:00Z',
      acknowledgeAuthorisation: true,
    });

    expect(res.statusCode).toBe(201);
    const params = db.query.mock.calls[0][1];
    expect(params).toEqual(expect.arrayContaining(['scheduled', '2026-10-01T09:00:00Z']));
    expect(params[9]).toBe(1); // authorised_by = this admin
    expect(params[10]).toBeInstanceOf(Date);
  });

  it('rejects an invalid scheduledAt', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Later', type: 'sms', templateKey: 'mpesa-alert', scheduledAt: 'not-a-date' });
    expect(res.statusCode).toBe(400);
  });

  it('saves an org copy of a template', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ key: 'mpesa-alert', body: 'Custom {{link}}', isCustom: true }] });

    const res = await request(app)
      .put('/api/campaigns/templates/mpesa-alert')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'Custom {{link}}' });

    expect(res.statusCode).toBe(200);
    expect(db.query.mock.calls[0][1]).toEqual([1, 'mpesa-alert', null, 'Custom {{link}}', null]);
  });
});

describe('launchDueCampaigns', () => {
  afterEach(() => jest.clearAllMocks());

  it('only picks up authorised campaigns and marks failed launches failed', async () => {
    const { launchDueCampaigns } = require('../src/modules/campaigns/campaigns.routes');
    const due = { id: 7, name: 'Due', type: 'sms', templateKey: 'mpesa-alert', status: 'launching' };
    mockQueries([
      ["status = 'scheduled' AND scheduled_at", () => ({ rows: [{ id: 7, organizationId: 1 }] })],
      ["SET status = 'launching'", () => ({ rows: [due] })],
      ['FROM campaign_templates', () => ({ rows: [{ type: 'sms', body: 'Hi {{link}}' }] })],
      ['FROM employees', () => ({ rows: [{ id: 10, phoneNumber: '+254700000000' }] })],
      ['INSERT INTO simulation_attempts', () => ({ rows: [{ trackingToken: 'tok' }] })],
    ]);
    smsClient.sendSms.mockRejectedValue(new Error('no AT credentials'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await launchDueCampaigns();

    expect(db.query.mock.calls[0][0]).toContain('authorised_at IS NOT NULL');
    expect(smsClient.sendSms).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("status = 'failed'"), [
      7,
      expect.stringContaining('Failed to send any SMS'),
    ]);
  });
});

describe('POST /api/campaigns/webhook/gophish', () => {
  afterEach(() => jest.clearAllMocks());
  beforeEach(() => {
    mockClient();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  function sign(body) {
    return `sha256=${crypto.createHmac('sha256', process.env.GOPHISH_WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex')}`;
  }

  function post(body) {
    return request(app).post('/api/campaigns/webhook/gophish').set('X-Gophish-Signature', sign(body)).send(body);
  }

  const campaignAndEmployee = [
    ['FROM simulation_campaigns WHERE gophish_campaign_id', () => ({ rows: [{ id: 1, organizationId: 1 }] })],
    ['FROM employees WHERE lower(email)', () => ({ rows: [{ id: 10 }] })],
    ['LEFT JOIN campaign_templates', () => ({ rows: [{ organizationId: 1, category: 'safaricom' }] })],
  ];

  it('rejects a request with a missing or wrong signature', async () => {
    const res = await request(app)
      .post('/api/campaigns/webhook/gophish')
      .set('X-Gophish-Signature', 'sha256=deadbeef')
      .send({ campaign_id: 55, email: 'emp1@acme.co.ke', message: 'Clicked Link' });
    expect(res.statusCode).toBe(401);
  });

  it('records a first click once, assigns training, and keeps the event time', async () => {
    const body = { campaign_id: 55, email: 'emp1@acme.co.ke', message: 'Clicked Link', time: '2026-10-21T08:00:00Z' };
    mockQueries([
      ...campaignAndEmployee,
      ['UPDATE simulation_attempts', () => ({ rowCount: 1 })],
      ['FROM training_modules WHERE organization_id', () => ({ rows: [{ id: 3 }] })],
    ]);

    const res = await post(body);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('ok');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('clicked_at IS NULL'), [
      1,
      10,
      new Date('2026-10-21T08:00:00Z'),
    ]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO training_assignments'), [3, 10]);
  });

  it('ignores a replayed event: no new training, no rescore', async () => {
    mockQueries([...campaignAndEmployee, ['UPDATE simulation_attempts', () => ({ rowCount: 0 })]]);

    const res = await post({ campaign_id: 55, email: 'emp1@acme.co.ke', message: 'Clicked Link' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Duplicate event ignored');
    const sqls = db.query.mock.calls.map(([sql]) => sql);
    expect(sqls.some((sql) => sql.includes('training_assignments'))).toBe(false);
    expect(sqls.some((sql) => sql.includes('susceptibility_scores'))).toBe(false);
  });

  it('records Email Reported events', async () => {
    mockQueries([...campaignAndEmployee, ['UPDATE simulation_attempts', () => ({ rowCount: 1 })]]);
    const res = await post({ campaign_id: 55, email: 'emp1@acme.co.ke', message: 'Email Reported' });
    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SET reported_at'), expect.any(Array));
  });

  it('never persists submitted form data', async () => {
    const body = {
      campaign_id: 55,
      email: 'emp1@acme.co.ke',
      message: 'Submitted Data',
      details: JSON.stringify({ payload: { username: ['jane.w'], password: ['Hunter2-secret'] } }),
    };
    mockQueries([...campaignAndEmployee, ['UPDATE simulation_attempts', () => ({ rowCount: 1 })]]);

    const res = await post(body);

    expect(res.statusCode).toBe(200);
    const everything = JSON.stringify(db.query.mock.calls);
    expect(everything).not.toContain('Hunter2-secret');
    expect(everything).not.toContain('jane.w');
  });

  it("only matches employees in the campaign's own organisation", async () => {
    mockQueries([
      ['FROM simulation_campaigns WHERE gophish_campaign_id', () => ({ rows: [{ id: 1, organizationId: 1 }] })],
      ['FROM employees WHERE lower(email)', (params) => ({ rows: params[1] === 1 ? [] : [{ id: 99 }] })],
    ]);

    const res = await post({ campaign_id: 55, email: 'other-org@x.co.ke', message: 'Clicked Link' });

    expect(res.body.message).toBe('Unknown employee');
    const sqls = db.query.mock.calls.map(([sql]) => sql);
    expect(sqls.some((sql) => sql.includes('UPDATE simulation_attempts'))).toBe(false);
  });

  it('rejects a malformed payload', async () => {
    const res = await post({ campaign_id: 'abc', message: 'Clicked Link' });
    expect(res.statusCode).toBe(400);
  });
});
