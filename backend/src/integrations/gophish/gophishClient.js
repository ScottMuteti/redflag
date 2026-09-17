const axios = require('axios');
const env = require('../../config/env');

const client = axios.create({
  baseURL: env.gophish.apiUrl,
  headers: { Authorization: `Bearer ${env.gophish.apiKey}` },
});

// TODO: wrap Gophish campaigns/groups/templates/results endpoints

module.exports = client;
