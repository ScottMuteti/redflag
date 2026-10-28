const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db');

const db = require('../src/config/db');
const app = require('../src/app');

const token = jwt.sign(
  { sub: 1, role: 'admin', organizationId: 1, email: 'admin@acme.co.ke' },
  process.env.JWT_SECRET,
);
const employeeToken = jwt.sign(
  { sub: 9, role: 'employee', organizationId: 1, email: 'emp@acme.co.ke' },
  process.env.JWT_SECRET,
);

// A transaction client whose INSERT ... employees returns a row unless the
// email is one we want to look already-taken.
function mockImportClient({ takenEmails = [] } = {}) {
  const client = {
    query: jest.fn((sql, params) => {
      if (sql.includes('INSERT INTO departments')) return Promise.resolve({ rows: [{ id: 7 }] });
      if (sql.includes('INSERT INTO employees')) {
        const email = params[3];
        if (takenEmails.includes(email)) return Promise.resolve({ rows: [] }); // ON CONFLICT DO NOTHING
        return Promise.resolve({ rows: [{ id: 100, fullName: params[2], email }] });
      }
      return Promise.resolve({ rows: [] });
    }),
    release: jest.fn(),
  };
  db.getClient.mockResolvedValue(client);
  return client;
}

describe('POST /api/employees/import', () => {
  afterEach(() => jest.clearAllMocks());

  it('imports valid rows and reports invalid ones with reasons', async () => {
    mockImportClient();
    const csv = [
      'fullName,email,phoneNumber,department',
      'Jane Wanjiku,jane@acme.co.ke,0712345678,Finance',
      'Peter Mwangi,peter@acme.co.ke,+254711222333,IT',
      ',missing-name@acme.co.ke,0712345678,HR',
      'Bad Email,not-an-email,0712345678,HR',
      'Bad Phone,phone@acme.co.ke,12345,HR',
    ].join('\n');

    const res = await request(app)
      .post('/api/employees/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ csv });

    expect(res.statusCode).toBe(201);
    expect(res.body.inserted).toBe(2);
    const reasons = res.body.rejected.map((r) => r.reason);
    expect(reasons).toEqual(
      expect.arrayContaining([
        'Missing fullName',
        'Invalid or missing email',
        'Invalid Kenyan phone number',
      ]),
    );
  });

  it('normalises Kenyan phone numbers to +254', async () => {
    const client = mockImportClient();
    await request(app)
      .post('/api/employees/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ csv: 'fullName,email,phoneNumber\nA B,ab@acme.co.ke,0712345678' });

    const insert = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO employees'));
    expect(insert[1][4]).toBe('+254712345678');
  });

  it('flags duplicate emails within the same file', async () => {
    mockImportClient();
    const csv = [
      'fullName,email',
      'One,dup@acme.co.ke',
      'Two,dup@acme.co.ke',
    ].join('\n');

    const res = await request(app)
      .post('/api/employees/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ csv });

    expect(res.body.inserted).toBe(1);
    expect(res.body.rejected[0].reason).toBe('Duplicate email within the file');
  });

  it('reports emails that already exist in the database', async () => {
    mockImportClient({ takenEmails: ['taken@acme.co.ke'] });
    const res = await request(app)
      .post('/api/employees/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ csv: 'fullName,email\nTaken,taken@acme.co.ke' });

    expect(res.body.inserted).toBe(0);
    expect(res.body.rejected[0].reason).toBe('Email already exists');
  });

  it('rejects a non-admin', async () => {
    const res = await request(app)
      .post('/api/employees/import')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ csv: 'fullName,email\nA,a@acme.co.ke' });
    expect(res.statusCode).toBe(403);
  });

  it('rejects a missing csv body', async () => {
    const res = await request(app)
      .post('/api/employees/import')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('rejects a payload larger than 1 MB with 413', async () => {
    const huge = 'x'.repeat(1024 * 1024 + 50);
    const res = await request(app)
      .post('/api/employees/import')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ csv: huge }));
    expect(res.statusCode).toBe(413);
  });
});
