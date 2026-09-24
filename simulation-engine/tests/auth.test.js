const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');

const db = require('../src/config/db');
const app = require('../src/app');

function mockClient() {
  const client = { query: jest.fn(), release: jest.fn() };
  db.getClient.mockResolvedValue(client);
  return client;
}

describe('POST /api/auth/register', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates an organization + admin and returns a token', async () => {
    const client = mockClient();
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // insert organizations
      .mockResolvedValueOnce({
        rows: [{ id: 5, organization_id: 1, full_name: 'Jane Admin', email: 'jane@acme.co.ke', role: 'admin' }],
      }) // insert admin_users
      .mockResolvedValueOnce(undefined); // COMMIT

    const res = await request(app).post('/api/auth/register').send({
      organizationName: 'Acme Ltd',
      adminFullName: 'Jane Admin',
      adminEmail: 'jane@acme.co.ke',
      adminPassword: 'supersecret',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('admin');
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toMatchObject({ sub: 5, role: 'admin', organizationId: 1 });
  });

  it('rejects a request missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ organizationName: 'Acme Ltd' });
    expect(res.statusCode).toBe(400);
  });

  it('rolls back and returns 409 on duplicate email', async () => {
    const client = mockClient();
    const conflict = Object.assign(new Error('duplicate'), { code: '23505', constraint: 'admin_users_email_key' });
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // insert organizations
      .mockRejectedValueOnce(conflict) // insert admin_users fails
      .mockResolvedValueOnce(undefined); // ROLLBACK

    const res = await request(app).post('/api/auth/register').send({
      organizationName: 'Acme Ltd',
      adminFullName: 'Jane Admin',
      adminEmail: 'jane@acme.co.ke',
      adminPassword: 'supersecret',
    });

    expect(res.statusCode).toBe(409);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks());

  it('logs in an admin with correct credentials', async () => {
    const passwordHash = await bcrypt.hash('adminpass1', 10);
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, organization_id: 1, full_name: 'Jane Admin', email: 'jane@acme.co.ke', password_hash: passwordHash, role: 'admin' }],
    });

    const res = await request(app).post('/api/auth/login').send({ email: 'jane@acme.co.ke', password: 'adminpass1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  it('falls back to employees when no admin matches', async () => {
    const passwordHash = await bcrypt.hash('employeepass1', 10);
    db.query
      .mockResolvedValueOnce({ rows: [] }) // admin_users lookup
      .mockResolvedValueOnce({
        rows: [{ id: 9, organization_id: 1, full_name: 'Employee One', email: 'emp@acme.co.ke', password_hash: passwordHash, role: 'employee' }],
      }); // employees lookup

    const res = await request(app).post('/api/auth/login').send({ email: 'emp@acme.co.ke', password: 'employeepass1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('employee');
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
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
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
