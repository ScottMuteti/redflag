// Local, offline template assistant for authorised awareness simulations.
// No external API and no API key: Regenerate assembles a fresh believable
// message from human-written phrase banks, and Refine applies keyword-driven
// transforms to the admin's current wording. Pure and deterministic enough to
// test; nothing typed here is sent anywhere or stored.

// Tracking placeholder each channel must keep, so a draft stays launchable.
const LINK_TOKEN = { email: '{{.URL}}', sms: '{{link}}' };

// Believable look-alike senders per category, used for sign-offs and tone.
const SENDERS = {
  mpesa: 'M-Pesa Customer Care',
  bank: 'Digital Banking',
  safaricom: 'Safaricom Customer Care',
  kra: 'Kenya Revenue Authority',
  invoice: 'Accounts Receivable',
  'it-support': 'IT Service Desk',
  'hr-payroll': 'Payroll Office',
  delivery: 'Courier Operations',
  'ceo-fraud': 'Office of the MD',
  sacco: 'SACCO Member Services',
  general: 'Customer Operations',
};

// Longer, multi-part scenarios per category. Each email draft is assembled from
// one fragment per slot, so the bank yields many believable combinations.
const EMAIL = {
  mpesa: {
    subject: ['Confirm a pending M-Pesa reversal', 'Action needed on your M-Pesa account'],
    context: [
      'During a routine check on your line we found a transaction that has been held pending your confirmation. Until it is confirmed the amount will not reflect on your statement.',
      'Our systems flagged a recent payment on your M-Pesa account for a short security confirmation. This is a standard step and takes less than a minute.',
    ],
    action: [
      'Please review the held transaction and confirm whether it was made by you so we can release or reverse it accordingly.',
      'Kindly open the secure confirmation page and verify the details on the pending entry.',
    ],
  },
  bank: {
    subject: ['Your account statement needs review', 'Confirmation required on two transactions'],
    context: [
      'As part of a routine security review of your account, two recent transactions were held for confirmation before they clear. Online access is limited until this is resolved, for your protection.',
      'We noticed a sign-in to your account from a device we did not recognise. To keep your money safe we have placed a short hold on new transfers.',
    ],
    action: [
      'Please review the transactions below and confirm the ones you recognise so normal access can be restored.',
      'Kindly verify your details on the secure page so we can lift the hold without delay.',
    ],
  },
  safaricom: {
    subject: ['Confirm your Safaricom account details', 'Annual account confirmation'],
    context: [
      'As part of our annual account review, every customer is asked to confirm the details we hold on file. This keeps your line, data bundles and services active without interruption.',
      'A loyalty reward has been applied to your account and is ready to be released once your details are confirmed.',
    ],
    action: [
      'Please confirm your account details on the secure page so your services continue uninterrupted.',
      'Kindly verify your information to complete the review and keep your line active.',
    ],
  },
  kra: {
    subject: ['Action required: compliance review on your PIN', 'KRA: confirm your filing details'],
    context: [
      'A routine iTax compliance review has flagged an item on your PIN that needs confirmation. Accounts that are not confirmed may face delays in clearance or a hold on the compliance certificate.',
      'Our records show your most recent filing is missing a short confirmation. Resolving it now avoids penalties and keeps your certificate valid.',
    ],
    action: [
      'Please confirm your PIN details on the secure iTax page so your record stays compliant.',
      'Kindly complete the short confirmation so your filing can be finalised.',
    ],
  },
  invoice: {
    subject: ['Updated payment details for invoice INV-2291', 'Invoice approval before the payment run'],
    context: [
      'Following a recent change to our banking, the attached invoice carries updated payment details. Please use these for the current payment run so the supplier is not delayed.',
      'The invoice below for last month’s supply is ready for your approval ahead of this week’s payment run.',
    ],
    action: [
      'Please review the invoice and approve it so we can schedule payment before Friday.',
      'Kindly confirm the updated details and approve the invoice for processing.',
    ],
  },
  'it-support': {
    subject: ['Re-enrol your multi-factor authentication', 'Scheduled account verification'],
    context: [
      'Following this week’s mailbox migration, staff are being asked to re-enrol multi-factor authentication. Accounts that are not re-enrolled will be locked out when the old sign-in method is retired on Monday.',
      'A scheduled verification is required on your account as part of routine identity maintenance. It takes about a minute and keeps your access active.',
    ],
    action: [
      'Please complete the short re-enrolment on the secure page today to avoid a lockout.',
      'Kindly verify your account so your access continues without interruption.',
    ],
  },
  'hr-payroll': {
    subject: ['Confirm your bank details before this month’s payroll', 'Payroll verification for your record'],
    context: [
      'We are finalising this month’s payroll and our records show the bank details on your profile may be out of date. Confirming them now keeps your salary on schedule.',
      'A short verification is needed on your payroll record before salaries are processed on Thursday.',
    ],
    action: [
      'Please confirm your bank details on the secure page before Thursday so your pay is not delayed.',
      'Kindly verify your record so payroll can be completed on time.',
    ],
  },
  delivery: {
    subject: ['Confirm delivery of your parcel', 'Your shipment needs a delivery-window confirmation'],
    context: [
      'A courier attempted to deliver a parcel addressed to you, but the delivery window could not be confirmed. The parcel is being held at the depot pending your confirmation.',
      'Your shipment is out for delivery and needs a short confirmation of the delivery window before the courier completes the drop-off.',
    ],
    action: [
      'Please confirm the delivery details on the secure page so the courier can complete delivery.',
      'Kindly confirm to avoid a second failed attempt and a return to sender.',
    ],
  },
  'ceo-fraud': {
    subject: ['Are you at your desk?', 'A quick confidential matter'],
    context: [
      'I am heading into a meeting and need you to handle something time-sensitive for me. Please keep this between us for now and I will explain shortly.',
      'I need a quick task taken care of while I am tied up. I cannot take calls right now, so please reply here and I will guide you from the meeting.',
    ],
    action: [
      'Open the secure note below for the details and let me know once it is done.',
      'Please view the request below and reply here; do not call, I am in the meeting.',
    ],
  },
  sacco: {
    subject: ['Confirm your dividend payout', 'Annual membership confirmation'],
    context: [
      'Your annual dividend statement is ready and needs a short confirmation before the payout can be disbursed. Confirming keeps your account and payouts up to date.',
      'Your membership record is due for its yearly confirmation. This keeps your account active and your dividends payable.',
    ],
    action: [
      'Please confirm your payout details on the secure page so disbursement can be completed.',
      'Kindly confirm your membership record to keep your account in good standing.',
    ],
  },
};

const SMS = {
  mpesa: ['M-PESA: A reversal of Ksh 4,500 is pending on your line and will not reflect until confirmed. Review the transaction here'],
  bank: ['Equity: Your account was locked after a sign-in from a new device. Restore access to avoid a hold here'],
  safaricom: ['Safaricom: Your 12,400 Bonga Points are due for confirmation before they expire. Confirm here'],
  delivery: ['G4S: Your parcel is held at the depot pending a delivery-window confirmation. Confirm to reschedule here'],
  sacco: ['SACCO: Your 2025 dividend is ready for disbursement once your payout details are confirmed. Update here'],
  general: ['Notice: A pending item on your account needs a short confirmation to continue. Review here'],
};

const GREETING = {
  easy: ['Dear Customer,', 'Hello,'],
  medium: ['Dear Customer,', 'Dear Member,'],
  hard: ['Hi {{.FirstName}},', 'Dear {{.FirstName}},'],
};

class TemplateWriterError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const senderFor = (category) => SENDERS[category] || SENDERS.general;

// Believable, theme-matching link text shown in the email. The href is always
// the tracking token; the mismatch with this look-alike URL is the tell.
const LINK_URLS = {
  bank: 'https://online.equity-online-ke.com/secure/verify',
  safaricom: 'https://care.safaricom-support.net/account',
  kra: 'https://itax.kra-go.ke.com/compliance',
  invoice: 'https://accounts.supp1ier-ke.com/invoices/INV-2291',
  'it-support': 'https://login.microsoftonline.m365-support.net/mfa',
  'hr-payroll': 'https://payroll.hr-portal-ke.com/bank-details',
  'ceo-fraud': 'https://secure-mail-ke.com/note/view',
  sacco: 'https://members.sacco-ke.org/loan/confirm',
  general: 'https://secure-account-verify.com/confirm',
};
const linkUrlFor = (category) => LINK_URLS[category] || LINK_URLS.general;

function regenerate({ type, category, difficultyLevel }) {
  const cat = category && (EMAIL[category] || SMS[category]) ? category : null;
  const level = difficultyLevel || 'medium';

  if (type === 'sms') {
    const bank = SMS[cat] || SMS.general;
    const body = `${pick(bank)}: ${LINK_TOKEN.sms}`;
    return {
      subject: '',
      body,
      notes: `Fresh ${cat || 'generic'} SMS scenario. Red flags left in: a link in an unexpected message and pressure to act. Keeps ${LINK_TOKEN.sms}.`,
    };
  }

  const bank = EMAIL[cat] || EMAIL.bank;
  const greeting = pick(GREETING[level] || GREETING.medium);
  const body =
    `<p>${greeting}</p>` +
    `<p>${pick(bank.context)}</p>` +
    `<p>${pick(bank.action)}</p>` +
    `<p>Confirm here: <a href="${LINK_TOKEN.email}">${linkUrlFor(cat)}</a></p>` +
    `<p>Regards,<br><strong>${senderFor(cat)}</strong></p>`;
  return {
    subject: pick(bank.subject),
    body,
    notes: `Fresh ${cat || 'generic'} email scenario, longer and more context-rich. Red flags left in: an unexpected link, a sense of urgency and a generic request to "confirm". Keeps ${LINK_TOKEN.email}.`,
  };
}

// --- Refine: keyword-driven transforms on the admin's current wording. ---

const URGENCY_EMAIL = 'Please action this today; access may be limited until it is resolved.';
const URGENCY_SMS = 'Confirm within 2 hours to avoid a hold.';

function refine({ type, subject, body, guidance, difficultyLevel }) {
  const g = (guidance || '').toLowerCase();
  const token = LINK_TOKEN[type];
  let out = body;
  const changes = [];

  // Tidy whitespace and spacing around punctuation first.
  out = out.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();

  if (/\b(short|shorter|concise|brief|trim|tighten)\b/.test(g)) {
    if (type === 'email') {
      // Drop the middle context paragraph if there is more than one.
      const paras = out.match(/<p>[\s\S]*?<\/p>/g) || [];
      if (paras.length > 3) {
        out = out.replace(paras[1], '');
        changes.push('shortened by removing a paragraph');
      }
    } else {
      out = out.replace(/\s{2,}/g, ' ');
      changes.push('tightened the wording');
    }
  }

  if (/\b(urgent|urgency|deadline|pressing|time)\b/.test(g)) {
    const line = type === 'email' ? URGENCY_EMAIL : URGENCY_SMS;
    if (!out.includes(line)) {
      out = type === 'email'
        ? out.replace(`<a href="${token}"`, `<p>${line}</p><p><a href="${token}"`).replace('</p><p><p>', '</p><p>')
        : out.replace(token, `${line} ${token}`);
      // Fallback: if the token wasn't where we expected, just prepend/append.
      if (!out.includes(line)) out = type === 'email' ? out + `<p>${line}</p>` : `${line} ${out}`;
      changes.push('added a time-pressure line');
    }
  }

  if (/\b(friendl|polite|soft|warm|calm)\b/.test(g)) {
    out = out
      .replace(/\bMUST\b/g, 'may wish to')
      .replace(/\bimmediately\b/gi, 'at your earliest convenience')
      .replace(/!/g, '.');
    changes.push('softened the tone');
  }

  if (/\b(formal|professional|corporate)\b/.test(g)) {
    out = out.replace(/\bHi\b/g, 'Dear').replace(/\bHey\b/gi, 'Dear');
    changes.push('made the greeting more formal');
  }

  if (/\b(name|personal|first ?name)\b/.test(g) && type === 'email' && !out.includes('{{.FirstName}}')) {
    out = out.replace(/(Dear|Hi|Hello)( Customer| Member)?,/, '$1 {{.FirstName}},');
    changes.push('added the recipient’s name');
  }

  // If guidance asked for nothing recognisable, do a light grammar pass.
  if (changes.length === 0) {
    out = out
      .replace(/\bi\b/g, 'I')
      .replace(/\s+([.,!?])/g, '$1')
      .replace(/\.{2,}/g, '.');
    changes.push('fixed spacing, capitalisation and punctuation');
  }

  if (!out.includes(token)) {
    throw new TemplateWriterError(422, `Refining dropped ${token}; add it back and try again`);
  }

  const level = difficultyLevel ? ` (kept at ${difficultyLevel} difficulty)` : '';
  return {
    subject: type === 'email' ? subject || '' : '',
    body: out,
    notes: `Refine${level}: ${changes.join('; ')}. The red flags in your wording are preserved.`,
  };
}

function rewriteTemplate(input) {
  const { mode, type } = input;
  if (mode === 'regenerate') return regenerate(input);
  return refine(input);
}

module.exports = { rewriteTemplate, TemplateWriterError, SENDERS };
