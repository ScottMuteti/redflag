const axios = require('axios');
const https = require('https');
const env = require('../../config/env');

// Gophish's admin API uses a self-signed cert by default (auto-generated on
// first run) — this is an internal, docker-network-only endpoint, not
// public-facing, so skipping cert verification here is expected, not a bug.
const client = axios.create({
  baseURL: env.gophish.apiUrl,
  headers: { Authorization: `Bearer ${env.gophish.apiKey}` },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

function splitName(fullName) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') || firstName };
}

async function createGroup(name, employees) {
  const { data } = await client.post('/api/groups/', {
    name,
    targets: employees.map((emp) => {
      const { firstName, lastName } = splitName(emp.fullName);
      return { first_name: firstName, last_name: lastName, email: emp.email, position: emp.jobTitle || '' };
    }),
  });
  return data;
}

async function createTemplate(name, subject, htmlBody) {
  const { data } = await client.post('/api/templates/', { name, subject, html: htmlBody });
  return data;
}

// Not called on every launch (a shared landing page is expected to already exist in
// Gophish, named env.gophish.landingPage) — exposed for one-off provisioning/setup.
async function createLandingPage(name, htmlBody) {
  const { data } = await client.post('/api/pages/', {
    name,
    html: htmlBody,
    capture_credentials: true,
    capture_passwords: true,
  });
  return data;
}

async function createCampaign({ name, groupName, templateName, pageName, url }) {
  const { data } = await client.post('/api/campaigns/', {
    name,
    template: { name: templateName },
    page: { name: pageName },
    url,
    smtp: { name: env.gophish.smtpProfile },
    groups: [{ name: groupName }],
  });
  return data;
}

async function getCampaignResults(gophishCampaignId) {
  const { data } = await client.get(`/api/campaigns/${gophishCampaignId}/results`);
  return data;
}

module.exports = { createGroup, createTemplate, createLandingPage, createCampaign, getCampaignResults };
