const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// Applies upgrades.sql. Every statement is idempotent, so it is safe on each start.
async function applyUpgrades() {
  const sql = fs.readFileSync(path.join(__dirname, 'upgrades.sql'), 'utf8');
  await db.query(sql);
}

module.exports = { applyUpgrades };
