const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');
jest.mock('../src/integrations/mail/mailer', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ delivered: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ delivered: true }),
  sendInviteEmail: jest.fn().mockResolvedValue({ delivered: true }),
  sendAccessRequestNotice: jest.fn().mockResolvedValue({ delivered: true }),
}));
jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  return { OAuth2Client: jest.fn(() => ({ verifyIdToken })), __verifyIdToken: verifyIdToken };
});

const db = require('../src/config/db');
const app = require('../src/app');

describe('POST /api/auth/access-requests', () => {
  afterEach(() => jest.clearAllMocks());
  const { sendAccessRequestNotice } = require('../src/integrations/mail/mailer');
  const body = {
    organizationName: 'Kilimo Sacco',
    contactName: 'Ann Wambui',
    contactEmail: 'ann@kilimo.co.ke',
    employeeCount: 40,
  };

  it('self sign-up is closed', async () => {
    const res = await request(app).post('/api/auth/register').send({ organizationName: 'Acme Ltd' });
    expect(res.statusCode).toBe(404);
  });

  it('stores a request and notifies platform admins, creating nothing else', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // open request check
      .mockResolvedValueOnce({ rows: [{ id: 1, organization_name: 'Kilimo Sacco' }] }) // insert
      .mockResolvedValueOnce({ rows: [{ email: 'ops@redflag.test' }] }); // system admins

    const res = await request(app).post('/api/auth/access-requests').send(body);

    expect(res.statusCode).toBe(202);
    expect(res.body.token).toBeUndefined();
    expect(db.query.mock.calls[1][0]).toMatch(/INSERT INTO access_requests/);
    expect(db.getClient).not.toHaveBeenCalled();
    expect(sendAccessRequestNotice).toHaveBeenCalledWith(['ops@redflag.test'], expect.any(Object));
  });

  it('does not duplicate an open request', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).post('/api/auth/access-requests').send(body);
    expect(res.statusCode).toBe(202);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('requires a valid contact email', async () => {
    const res = await request(app)
      .post('/api/auth/access-requests')
      .send({ ...body, contactEmail: 'nope' });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks());

  it('issues an email 2FA challenge (not a token) for a correct admin password', async () => {
    const passwordHash = await bcrypt.hash('adminpass1', 10);
    db.query
      .mockResolvedValueOnce({ rows: [] }) // system_admins lookup
      .mockResolvedValueOnce({
        rows: [{ id: 1, organization_id: 1, full_name: 'Jane Admin', email: 'jane@acme.co.ke', password_hash: passwordHash, role: 'admin' }],
      }) // admin lookup
      .mockResolvedValueOnce({ rows: [] }); // insert login_otps

    const res = await request(app).post('/api/auth/login').send({ email: 'jane@acme.co.ke', password: 'adminpass1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.challengeId).toEqual(expect.any(String));
    expect(res.body.token).toBeUndefined();
  });

  it('falls back to employees when no admin matches', async () => {
    const passwordHash = await bcrypt.hash('employeepass1', 10);
    db.query
      .mockResolvedValueOnce({ rows: [] }) // system_admins lookup
      .mockResolvedValueOnce({ rows: [] }) // admin_users lookup
      .mockResolvedValueOnce({
        rows: [{ id: 9, organization_id: 1, full_name: 'Employee One', email: 'emp@acme.co.ke', password_hash: passwordHash, role: 'employee' }],
      }) // employees lookup
      .mockResolvedValueOnce({ rows: [] }); // insert login_otps

    const res = await request(app).post('/api/auth/login').send({ email: 'emp@acme.co.ke', password: 'employeepass1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpass', 10);
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, organization_id: 1, full_name: 'Jane Admin', email: 'jane@acme.co.ke', password_hash: passwordHash, role: 'admin' }],
    });

    const res = await request(app).post('/api/auth/login').send({ email: 'jane@acme.co.ke', password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects an unknown email', async () => {
    db.query.mockResolvedValue({ rows: [] }); // no system admin, admin or employee
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@acme.co.ke', password: 'whatever1' });
    expect(res.statusCode).toBe(401);
  });

  it('rate-limits after 10 attempts from the same client', async () => {
    db.query.mockResolvedValue({ rows: [] });

    let lastStatus;
    for (let i = 0; i < 11; i += 1) {
      const res = await request(app).post('/api/auth/login').send({ email: 'nobody@acme.co.ke', password: 'whatever1' });
      lastStatus = res.statusCode;
    }

    expect(lastStatus).toBe(429);
  });
});

describe('POST /api/auth/login/verify', () => {
  afterEach(() => jest.clearAllMocks());

  function futureOtpRow(overrides = {}) {
    return {
      id: 7,
      challenge_id: 'challenge-123',
      user_id: 1,
      user_role: 'admin',
      organization_id: 1,
      email: 'jane@acme.co.ke',
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      consumed_at: null,
      ...overrides,
    };
  }

  it('exchanges a correct code for a token', async () => {
    const codeHash = await bcrypt.hash('123456', 10);
    db.query
      .mockResolvedValueOnce({ rows: [futureOtpRow({ code_hash: codeHash })] }) // SELECT otp
      .mockResolvedValueOnce({ rows: [] }) // UPDATE consume
      .mockResolvedValueOnce({
        rows: [{ id: 1, organization_id: 1, full_name: 'Jane Admin', email: 'jane@acme.co.ke', role: 'admin' }],
      }); // SELECT user

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ challengeId: 'challenge-123', code: '123456' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('admin');
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({ sub: 1, role: 'admin', organizationId: 1 });
    expect(decoded.exp - decoded.iat).toBe(20 * 60); // 20-minute session
  });

  it('rejects an incorrect code', async () => {
    const codeHash = await bcrypt.hash('123456', 10);
    db.query
      .mockResolvedValueOnce({ rows: [futureOtpRow({ code_hash: codeHash })] }) // SELECT otp
      .mockResolvedValueOnce({ rows: [] }); // UPDATE attempts

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ challengeId: 'challenge-123', code: '000000' });

    expect(res.statusCode).toBe(401);
  });

  it('rejects an unknown or expired challenge', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ challengeId: 'nope', code: '123456' });
    expect(res.statusCode).toBe(401);
  });

  it('burns the challenge after too many wrong codes', async () => {
    const codeHash = await bcrypt.hash('123456', 10);
    db.query
      .mockResolvedValueOnce({ rows: [futureOtpRow({ code_hash: codeHash, attempts: 5 })] }) // SELECT otp
      .mockResolvedValueOnce({ rows: [] }); // UPDATE consume

    const res = await request(app)
      .post('/api/auth/login/verify')
      .send({ challengeId: 'challenge-123', code: '123456' });

    expect(res.statusCode).toBe(429);
  });
});

const { __verifyIdToken: verifyIdToken } = require('google-auth-library');

describe('POST /api/auth/google', () => {
  afterEach(() => jest.clearAllMocks());

  const googleTicket = (payload) => ({ getPayload: () => payload });

  it('advertises the Google client ID', async () => {
    const res = await request(app).get('/api/auth/providers');
    expect(res.body.googleClientId).toBe('test-google-client-id');
  });

  it('sends a pre-approved account on to the email code step', async () => {
    verifyIdToken.mockResolvedValueOnce(googleTicket({ email: 'jane@acme.co.ke', email_verified: true }));
    db.query
      .mockResolvedValueOnce({ rows: [] }) // system_admins lookup
      .mockResolvedValueOnce({
        rows: [{ id: 1, organization_id: 1, full_name: 'Jane Admin', email: 'jane@acme.co.ke', role: 'admin' }],
      }) // admin lookup
      .mockResolvedValueOnce({ rows: [] }); // insert login_otps

    const res = await request(app).post('/api/auth/google').send({ credential: 'google-id-token' });

    expect(res.statusCode).toBe(200);
    expect(res.body.mfaRequired).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects an account nobody has approved', async () => {
    verifyIdToken.mockResolvedValueOnce(googleTicket({ email: 'stranger@gmail.com', email_verified: true }));
    db.query.mockResolvedValue({ rows: [] }); // no system admin, admin or employee

    const res = await request(app).post('/api/auth/google').send({ credential: 'google-id-token' });

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('NOT_APPROVED');
  });

  it('rejects an invalid Google token', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('bad token'));
    const res = await request(app).post('/api/auth/google').send({ credential: 'forged' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects an unverified Google email', async () => {
    verifyIdToken.mockResolvedValueOnce(googleTicket({ email: 'jane@acme.co.ke', email_verified: false }));
    const res = await request(app).post('/api/auth/google').send({ credential: 'google-id-token' });
    expect(res.statusCode).toBe(401);
  });
});

describe('passkeys', () => {
  afterEach(() => jest.clearAllMocks());

  it('issues login options with a challenge', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // insert challenge
    const res = await request(app).post('/api/auth/passkeys/login/options');
    expect(res.statusCode).toBe(200);
    expect(res.body.challengeId).toEqual(expect.any(String));
    expect(res.body.options.challenge).toEqual(expect.any(String));
    expect(res.body.options.userVerification).toBe('required');
  });

  it('treats an unknown passkey as not approved', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ challenge: 'abc' }] }) // take challenge
      .mockResolvedValueOnce({ rows: [] }); // passkey lookup

    const res = await request(app)
      .post('/api/auth/passkeys/login/verify')
      .send({ challengeId: 'c-1', response: { id: 'unknown-cred' } });

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('NOT_APPROVED');
  });

  it('rejects an expired login challenge', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/passkeys/login/verify')
      .send({ challengeId: 'old', response: { id: 'cred' } });
    expect(res.statusCode).toBe(401);
  });

  it('only lets signed-in users register a passkey', async () => {
    const res = await request(app).post('/api/auth/passkeys/register/options');
    expect(res.statusCode).toBe(401);
  });

  it('builds registration options for a signed-in user', async () => {
    const token = jwt.sign({ sub: 9, role: 'employee', organizationId: 1, email: 'emp@acme.co.ke' }, process.env.JWT_SECRET);
    db.query
      .mockResolvedValueOnce({ rows: [] }) // existing passkeys
      .mockResolvedValueOnce({ rows: [] }); // insert challenge

    const res = await request(app)
      .post('/api/auth/passkeys/register/options')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.options.user.name).toBe('emp@acme.co.ke');
    expect(res.body.options.authenticatorSelection.residentKey).toBe('required');
  });
});

describe('suspended organisations', () => {
  afterEach(() => jest.clearAllMocks());

  it('refuses to finish login once the organisation is suspended', async () => {
    const codeHash = await bcrypt.hash('123456', 10);
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 7, user_id: 1, user_role: 'admin', code_hash: codeHash, attempts: 0, consumed_at: null, expires_at: new Date(Date.now() + 60000) }],
      }) // SELECT otp
      .mockResolvedValueOnce({ rows: [] }) // UPDATE consume
      .mockResolvedValueOnce({
        rows: [{ id: 1, organization_id: 1, email: 'jane@acme.co.ke', role: 'admin', suspended_at: new Date() }],
      }); // SELECT user

    const res = await request(app).post('/api/auth/login/verify').send({ challengeId: 'c-1', code: '123456' });

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('ORG_SUSPENDED');
  });
});

describe('password reset', () => {
  afterEach(() => jest.clearAllMocks());
  const { sendPasswordResetEmail } = require('../src/integrations/mail/mailer');

  it('emails a link for a known account', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // system_admins lookup
      .mockResolvedValueOnce({ rows: [{ id: 1, organization_id: 1, email: 'jane@acme.co.ke', role: 'admin' }] })
      .mockResolvedValueOnce({ rows: [] }); // insert password_resets

    const res = await request(app).post('/api/auth/password/forgot').send({ email: 'jane@acme.co.ke' });

    expect(res.statusCode).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'jane@acme.co.ke',
      expect.stringMatching(/\/reset-password\?token=/),
    );
  });

  it('answers the same for an unknown email and sends nothing', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(app).post('/api/auth/password/forgot').send({ email: 'nobody@acme.co.ke' });
    expect(res.statusCode).toBe(200);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('sets a new password with a valid token', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 1, user_role: 'admin' }] }) // consume token
      .mockResolvedValueOnce({ rowCount: 1 }) // update password
      .mockResolvedValueOnce({ rowCount: 0 }); // burn other tokens

    const res = await request(app).post('/api/auth/password/reset').send({ token: 'tok', password: 'newpass123' });

    expect(res.statusCode).toBe(204);
    expect(db.query.mock.calls[1][0]).toMatch(/UPDATE admin_users SET password_hash/);
  });

  it('rejects an expired or used token', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/password/reset').send({ token: 'old', password: 'newpass123' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a short password before touching the token', async () => {
    const res = await request(app).post('/api/auth/password/reset').send({ token: 'tok', password: 'short' });
    expect(res.statusCode).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});

