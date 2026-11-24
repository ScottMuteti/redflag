const AfricasTalking = require('africastalking');
const env = require('../../config/env');

// Africa's Talking sandbox mode does not support custom sender IDs — messages
// send from a shared shortcode. That's a sandbox limitation, not a bug here.
//
// Instantiated lazily (not at module load) because the SDK validates its API
// key eagerly and throws if it's empty — campaigns.routes.js requires this
// module unconditionally, so an eager instantiation would crash the whole
// backend at boot whenever AT credentials aren't configured yet, even for
// deployments that only use email campaigns.
let smsService;
function getSmsService() {
  if (!smsService) {
    smsService = AfricasTalking({ apiKey: env.africasTalking.apiKey, username: env.africasTalking.username }).SMS;
  }
  return smsService;
}

// Each recipient gets a unique tracking link, so messages aren't identical —
// sent one at a time rather than as a single true "bulk" call.
// AT answers 2xx even when it rejects a recipient (bad number, no balance,
// blacklisted), so the per-recipient status decides whether it was sent.
const ACCEPTED = [100, 101, 102]; // processed, sent, queued

async function sendSms(to, message) {
  const reply = await getSmsService().send({ to: [to], message });
  const recipient = reply?.SMSMessageData?.Recipients?.[0];
  if (!recipient || !ACCEPTED.includes(recipient.statusCode)) {
    throw new Error(recipient?.status || reply?.SMSMessageData?.Message || 'SMS was not accepted');
  }
  return reply;
}

module.exports = { sendSms };
