// Applies src/db/migrations/*.sql in filename order, once each, tracked in
// schema_migrations. Run on engine start and via `npm run migrate`.
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate({ log = console.log } = {}) {
  const client = await db.getClient();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name VARCHAR(255) PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );

    // Databases created before migrations existed already ran 001 via the
    // Postgres init script; record it as applied instead of re-running it.
    const { rows: tracked } = await client.query('SELECT name FROM schema_migrations');
    const { rows: legacy } = await client.query("SELECT to_regclass('organizations') AS t");
    if (tracked.length === 0 && legacy[0].t) {
      await client.query("INSERT INTO schema_migrations (name) VALUES ('001_schema.sql')");
      tracked.push({ name: '001_schema.sql' });
    }

    const applied = new Set(tracked.map((r) => r.name));
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`Applied migration ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    client.release();
  }
}

module.exports = { migrate };

if (require.main === module) {
  require('dotenv').config();
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
