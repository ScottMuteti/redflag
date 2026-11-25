const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');
jest.mock('../src/integrations/gophish/gophishClient');
jest.mock('../src/integrations/africasTalking/smsClient');

const db = require('../src/config/db');
const app = require('../src/app');

const token = jwt.sign(
  { sub: 1, role: 'admin', organizationId: 1, email: 'admin@acme.co.ke' },
  process.env.JWT_SECRET,
);
const post = (body) =>
  request(app)
    .post('/api/campaigns/templates/assist')
    .set('Authorization', `Bearer ${token}`)
    .send(body);

const SMS = { type: 'sms', category: 'mpesa', body: 'Your M-Pesa is on hold. Verify: {{link}}' };
const EMAIL = {
  type: 'email',
  category: 'bank',
  subject: 'Please confirm',
  body: '<p>Dear Customer,</p><p>Confirm here <a href="{{.URL}}">link</a></p>',
};

describe('template assist (local engine)', () => {
  beforeEach(() => db.query.mockResolvedValue({ rows: [] }));
  afterEach(() => jest.clearAllMocks());

  it('refines wording locally without saving and keeps the tracking link', async () => {
    const res = await post({ ...SMS, mode: 'refine', guidance: 'more urgent' });
    expect(res.status).toBe(200);
    expect(res.body.body).toContain('{{link}}');
    expect(res.body.subject).toBe('');
    expect(res.body.notes).toMatch(/Refine/);
    expect(db.query.mock.calls.some(([sql]) => /INSERT|UPDATE/.test(sql))).toBe(false);
  });

  it('regenerates a fresh email that keeps {{.URL}}', async () => {
    const res = await post({ ...EMAIL, mode: 'regenerate', difficultyLevel: 'hard' });
    expect(res.status).toBe(200);
    expect(res.body.body).toContain('{{.URL}}');
    expect(res.body.subject).toBeTruthy();
    expect(res.body.body.length).toBeGreaterThan(100);
  });

  it('rejects a refine that would drop the tracking link', async () => {
    const res = await post({ ...SMS, mode: 'refine', body: 'No link in this body at all' });
    expect(res.status).toBe(422);
  });

  it('validates input', async () => {
    expect((await post({ ...SMS, mode: 'other' })).status).toBe(400);
    expect((await post({ ...SMS, mode: 'refine', body: '' })).status).toBe(400);
    expect((await post({ ...SMS, mode: 'refine', guidance: 'x'.repeat(501) })).status).toBe(400);
  });
});
