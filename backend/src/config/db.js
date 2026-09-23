const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool(env.db);

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
