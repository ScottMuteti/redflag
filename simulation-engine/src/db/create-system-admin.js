// Creates a platform (system) admin. There is no sign-up for this role.
// Run: npm run create:system-admin -- <email> "<Full Name>"
// Prints a one-time set-password link (72 h) instead of taking a password, so
// none ends up in shell history.
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { migrate } = require('./migrate');
const { createPasswordLink, INVITE_TTL_MS } = require('../modules/auth/passwordReset.routes');

async function main() {
  const [email, fullName] = process.argv.slice(2);
  if (!email || !fullName) {
    console.error('Usage: npm run create:system-admin -- <email> "<Full Name>"');
    process.exit(1);
  }

  await migrate({ log: () => {} });
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const { rows } = await db.query(
    `INSERT INTO system_admins (full_name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id, role`,
    [fullName, email, passwordHash],
  );
  const link = await createPasswordLink(rows[0], INVITE_TTL_MS);
  console.log(`System admin ${email} ready. Set the password here (valid 72 h):\n${link}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
