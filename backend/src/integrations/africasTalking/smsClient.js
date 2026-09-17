const AfricasTalking = require('africastalking');
const env = require('../../config/env');

const africasTalking = AfricasTalking({
  apiKey: env.africasTalking.apiKey,
  username: env.africasTalking.username,
});

// TODO: wrap SMS sending for smishing campaigns + delivery status callbacks

module.exports = africasTalking.SMS;
