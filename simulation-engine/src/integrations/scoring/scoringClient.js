const axios = require('axios');
const env = require('../../config/env');

const RISK_LEVELS = ['low', 'medium', 'high'];

class ScoringUnavailableError extends Error {}

// Calls the risk-model /predict endpoint. Any failure (down, timeout, model not
// loaded, malformed reply) becomes ScoringUnavailableError so callers can say
// "score unavailable" instead of storing or showing a made-up value.
async function predict(features) {
  let data;
  try {
    ({ data } = await axios.post(`${env.mlServiceUrl}/predict`, features, {
      timeout: env.mlTimeoutMs,
    }));
  } catch (err) {
    if (err.response?.status === 503) {
      throw new ScoringUnavailableError('Scoring model is not loaded');
    }
    throw new ScoringUnavailableError(
      `Scoring service unreachable (${err.code || err.response?.status || err.message})`,
    );
  }

  const valid =
    data &&
    typeof data.score === 'number' &&
    data.score >= 0 &&
    data.score <= 1 &&
    RISK_LEVELS.includes(data.risk_level) &&
    typeof data.model_version === 'string' &&
    data.model_version.length > 0;
  if (!valid) throw new ScoringUnavailableError('Scoring service returned an invalid response');

  return {
    score: data.score,
    riskLevel: data.risk_level,
    modelVersion: data.model_version,
    lowData: Boolean(data.low_data),
  };
}

module.exports = { predict, ScoringUnavailableError };
