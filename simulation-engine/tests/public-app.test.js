const request = require('supertest');

jest.mock('../src/config/db');

const db = require('../src/config/db');
const publicApp = require('../src/publicApp');

// The internet-facing app must carry ONLY the click-tracking endpoint. These
// tests are the design-first guarantee: admin routes cannot be reached through
// the public tunnel because they are not mounted on this process at all.
describe('public surface (publicApp)', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  it('does not expose the admin API — admin paths are 404', async () => {
    const adminPaths = [
      '/api/auth/login',
      '/api/employees',
      '/api/campaigns',
      '/api/scoring/compute',
      '/api/analytics/overview',
      '/api/reports',
    ];
    const results = await Promise.all(
      adminPaths.map((path) => request(publicApp).get(path)),
    );
    for (const res of results) expect(res.status).toBe(404);
    // No admin route ran, so no DB query was ever issued.
    expect(db.query).not.toHaveBeenCalled();
  });

  it('serves the click-tracking endpoint', async () => {
    // The token lookup finds an attempt; every other query (campaign/category
    // lookup, the transactional UPDATE) is benign, so recordEvent records no
    // first-time event (rowCount 0) and skips training/rescoring.
    db.query.mockImplementation((sql) =>
      sql.includes('tracking_token')
        ? Promise.resolve({ rows: [{ campaignId: 1, employeeId: 1 }] })
        : Promise.resolve({ rows: [], rowCount: 0 }),
    );
    db.getClient.mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    });

    const res = await request(publicApp).get('/api/campaigns/track/some-token');
    expect(res.status).toBe(200);
    expect(res.text).toContain('simulated smishing');
  });

  it('returns 404 for an unknown tracking token', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const res = await request(publicApp).get('/api/campaigns/track/nope');
    expect(res.status).toBe(404);
  });
});
