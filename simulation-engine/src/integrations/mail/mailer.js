const nodemailer = require('nodemailer');
const env = require('../../config/env');

// A single reused Gmail transport, built lazily from GMAIL_USER / GMAIL_APP_PASSWORD.
let transport;
function getTransport() {
  if (transport) return transport;
  if (!env.gmail.user || !env.gmail.appPassword) return null;
  transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.gmail.user, pass: env.gmail.appPassword },
  });
  return transport;
}

// Request details come from the public form, so escape them in HTML mail.
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Sends one message. If SMTP is not configured or the send fails, `logLine` is
// printed instead so a local demo still works without a real inbox.
async function deliver({ to, subject, text, html, logLine }) {
  const t = getTransport();
  if (!t) {
    console.warn(`[mail] SMTP not configured — ${logLine}`);
    return { delivered: false };
  }
  try {
    await t.sendMail({ from: `RedFlag Security <${env.gmail.user}>`, to, subject, text, html });
    return { delivered: true };
  } catch (err) {
    console.warn(`[mail] send to ${to} failed (${err.message}) — ${logLine}`);
    return { delivered: false };
  }
}

// Sends the login OTP. The code is never persisted.
async function sendOtpEmail(to, code) {
  // Demo/dev convenience: surface the code in the log when explicitly enabled.
  if (env.otpDebug) console.warn(`[2FA][OTP_DEBUG] login code for ${to}: ${code}`);
  return deliver({
    to,
    subject: 'Your RedFlag login code',
    text: `Your RedFlag login code is ${code}. It expires in 10 minutes. If you did not try to log in, ignore this email.`,
    html: `<p>Your RedFlag login code is <strong style="font-size:20px;letter-spacing:3px">${code}</strong>.</p>
           <p>It expires in 10 minutes. If you did not try to log in, you can ignore this email.</p>`,
    logLine: `login code for ${to}: ${code}`,
  });
}

async function sendPasswordResetEmail(to, link) {
  return deliver({
    to,
    subject: 'Reset your RedFlag password',
    text: `Reset your RedFlag password: ${link}
The link expires in 30 minutes. If you did not ask for this, ignore this email.`,
    html: `<p><a href="${link}">Reset your RedFlag password</a></p>
           <p>The link expires in 30 minutes. If you did not ask for this, you can ignore this email.</p>`,
    logLine: `password reset link for ${to}: ${link}`,
  });
}

// Sent when the platform team onboards an organisation's first admin.
async function sendInviteEmail(to, organizationName, link) {
  return deliver({
    to,
    subject: `You've been added to RedFlag for ${organizationName}`,
    text: `You're the RedFlag admin for ${organizationName}. Set your password: ${link}
The link expires in 72 hours.`,
    html: `<p>You're the RedFlag admin for <strong>${escapeHtml(organizationName)}</strong>.</p>
           <p><a href="${link}">Set your password</a> (expires in 72 hours).</p>`,
    logLine: `invite link for ${to}: ${link}`,
  });
}

// Tells platform admins a new organisation is asking for access.
async function sendAccessRequestNotice(adminEmails, request) {
  if (adminEmails.length === 0) {
    console.warn(`[mail] access request #${request.id} from ${request.organization_name}; no system admins to notify`);
    return { delivered: false };
  }
  return deliver({
    to: adminEmails.join(', '),
    subject: `RedFlag access request: ${request.organization_name}`,
    text: `${request.contact_name} (${request.contact_email}) asked for RedFlag access for ${request.organization_name}. Review it under Organisations.`,
    html: `<p><strong>${escapeHtml(request.contact_name)}</strong> (${escapeHtml(request.contact_email)}) asked for RedFlag access for
           <strong>${escapeHtml(request.organization_name)}</strong>.</p><p>Review it under Organisations.</p>`,
    logLine: `access request #${request.id} from ${request.organization_name}`,
  });
}

async function sendAccessDeclinedEmail(to, organizationName) {
  return deliver({
    to,
    subject: 'Your RedFlag access request',
    text: `Thanks for your interest in RedFlag. We can't set up ${organizationName} right now. Reply to this email if you have questions.`,
    html: `<p>Thanks for your interest in RedFlag. We can't set up <strong>${escapeHtml(organizationName)}</strong> right now.</p>
           <p>Reply to this email if you have questions.</p>`,
    logLine: `access request declined for ${to}`,
  });
}

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
  sendAccessRequestNotice,
  sendAccessDeclinedEmail,
};
