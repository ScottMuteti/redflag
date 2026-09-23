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
    const campaign = { id: 1, name: 'Safaricom Drill', type: 'email', templateKey: 'safaricom-impersonation', status: 'draft' };
    const template = { type: 'email', subject: 'Verify now', body: '<a href="{{link}}">verify</a>' };
    const employees = [{ id: 10, fullName: 'Employee One', email: 'emp1@acme.co.ke', phoneNumber: null, jobTitle: 'Analyst' }];

    mockQueries([
      ['FROM simulation_campaigns WHERE id', () => ({ rows: [campaign] })],
      ['FROM campaign_templates', () => ({ rows: [template] })],
      ['FROM employees WHERE organization_id', () => ({ rows: employees })],
      ['UPDATE simulation_campaigns', () => ({ rowCount: 1 })],
      ['INSERT INTO simulation_attempts', () => ({ rows: [] })],
    ]);

    gophishClient.createGroup.mockResolvedValue({ id: 1, name: 'redflag-1' });
    gophishClient.createTemplate.mockResolvedValue({ id: 2, name: 'redflag-1' });
    gophishClient.createCampaign.mockResolvedValue({ id: 55, name: 'redflag-1-Safaricom Drill' });

    const res = await request(app).post('/api/campaigns/1/launch').set('Authorization', `Bearer ${token}`).send({});

    expect(res.statusCode).toBe(200);
    expect(gophishClient.createGroup).toHaveBeenCalledWith('redflag-1', employees);
    expect(gophishClient.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ groupName: 'redflag-1', templateName: 'redflag-1' }),
    );
    expect(smsClient.sendSms).not.toHaveBeenCalled();
  });

  it('launches an SMS campaign with a per-employee tracking link', async () => {
    const campaign = { id: 2, name: 'Mpesa SMS Drill', type: 'sms', templateKey: 'mpesa-alert', status: 'draft' };
    const template = { type: 'sms', subject: null, body: 'M-PESA alert: {{link}}' };
    const employees = [{ id: 20, fullName: 'Employee Two', email: 'emp2@acme.co.ke', phoneNumber: '+254711111111', jobTitle: null }];

    mockQueries([
      ['FROM simulation_campaigns WHERE id', () => ({ rows: [campaign] })],
      ['FROM campaign_templates', () => ({ rows: [template] })],
      ['FROM employees WHERE organization_id', () => ({ rows: employees })],
      ['INSERT INTO simulation_attempts', () => ({ rows: [{ trackingToken: 'tok-123' }] })],
      ['UPDATE simulation_campaigns', () => ({ rowCount: 1 })],
    ]);

    const res = await request(app).post('/api/campaigns/2/launch').set('Authorization', `Bearer ${token}`).send({});

    expect(res.statusCode).toBe(200);
    expect(smsClient.sendSms).toHaveBeenCalledWith(
      '+254711111111',
      expect.stringContaining('/api/campaigns/track/tok-123'),
    );
    expect(gophishClient.createGroup).not.toHaveBeenCalled();
  });

  it('refuses to relaunch a campaign that is not a draft', async () => {
    mockQueries([['FROM simulation_campaigns WHERE id', () => ({ rows: [{ id: 3, type: 'sms', status: 'running' }] })]]);

    const res = await request(app).post('/api/campaigns/3/launch').set('Authorization', `Bearer ${token}`).send({});
    expect(res.statusCode).toBe(409);
  });

  it('creates a scheduled campaign when scheduledAt is given', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 4, status: 'scheduled' }] });

    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Later', type: 'sms', templateKey: 'mpesa-alert', scheduledAt: '2026-10-01T09:00:00Z' });

    expect(res.statusCode).toBe(201);
    expect(db.query.mock.calls[0][1]).toEqual(expect.arrayContaining(['scheduled', '2026-10-01T09:00:00Z']));
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
    expect(db.query.mock.calls[0][1]).toEqual([1, 'mpesa-alert', null, 'Custom {{link}}']);
  });
});

describe('launchDueCampaigns', () => {
  afterEach(() => jest.clearAllMocks());

  it('launches due campaigns and reverts failed ones to draft', async () => {
    const { launchDueCampaigns } = require('../src/modules/campaigns/campaigns.routes');
    const due = { id: 7, name: 'Due', type: 'sms', templateKey: 'mpesa-alert', status: 'scheduled', organizationId: 1 };
    mockQueries([
      ["status = 'scheduled'", () => ({ rows: [due] })],
      ['FROM campaign_templates', () => ({ rows: [{ type: 'sms', body: 'Hi {{link}}' }] })],
      ['FROM employees', () => ({ rows: [{ id: 10, phoneNumber: '+254700000000' }] })],
      ['INSERT INTO simulation_attempts', () => ({ rows: [{ trackingToken: 'tok' }] })],
    ]);
    smsClient.sendSms.mockRejectedValue(new Error('no AT credentials'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await launchDueCampaigns();

    expect(smsClient.sendSms).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'draft'"), [7]);
  });
});

describe('POST /api/campaigns/webhook/gophish', () => {
  afterEach(() => jest.clearAllMocks());

  function sign(body) {
    return `sha256=${crypto.createHmac('sha256', process.env.GOPHISH_WEBHOOK_SECRET).update(JSON.stringify(body)).digest('hex')}`;
  }

  it('rejects a request with a missing or wrong signature', async () => {
    const res = await request(app)
      .post('/api/campaigns/webhook/gophish')
      .set('X-Gophish-Signature', 'sha256=deadbeef')
      .send({ campaign_id: 55, email: 'emp1@acme.co.ke', message: 'Clicked Link' });
    expect(res.statusCode).toBe(401);
  });

  it('maps a valid Clicked Link event onto the matching simulation_attempts row', async () => {
    const body = { campaign_id: 55, email: 'emp1@acme.co.ke', message: 'Clicked Link' };
    mockQueries([
      ['FROM simulation_campaigns WHERE gophish_campaign_id', () => ({ rows: [{ id: 1 }] })],
      ['FROM employees WHERE email', () => ({ rows: [{ id: 10 }] })],
      ['UPDATE simulation_attempts', () => ({ rowCount: 1 })],
    ]);

    const res = await request(app).post('/api/campaigns/webhook/gophish').set('X-Gophish-Signature', sign(body)).send(body);

    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('clicked_at = now()'), [1, 10]);
  });
});
