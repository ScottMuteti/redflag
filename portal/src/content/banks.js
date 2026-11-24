// Phrase banks for the internal sample generator (no external AI / no network).
// The generator (generator.js) assembles complete lure messages by picking one
// fragment from each slot, so a handful of options per slot yields hundreds of
// realistic combinations per category/channel/difficulty — a renewable pool.
//
// Difficulty is encoded purely by which fragments a tier contains:
//   easy   - obvious tells: prizes, bad grammar, generic greeting, odd links.
//   medium - plausible branding, a short back-story and mild urgency, one tell.
//   hard   - clean tone, a believable scenario, personalisation tags
//            ({{.FirstName}}/{{.Position}}), near-miss sender domains.
// Email tiers carry a `detail` slot (an extra paragraph of context) so bodies
// read as a real message, not a one-liner. SMS bodies use {{link}}; email
// bodies use {{.URL}} (engine-substituted).
// Every fragment here is human-written and reviewed; output is always safe and
// is only ever delivered to enrolled staff inside an authorised simulation.

export const CATEGORIES = [
  'mpesa',
  'bank',
  'safaricom',
  'kra',
  'invoice',
  'it-support',
  'hr-payroll',
  'delivery',
  'ceo-fraud',
  'sacco',
];

export const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Believable "From" senders shown in previews, by category and difficulty.
// easy  = obviously wrong (free mail / gibberish), a clear tell.
// medium = plausible but not the real domain.
// hard  = near-miss look-alike of the real sender.
// Format: "Display Name <address>". SMS uses the sender header, not an address.
export const SENDERS = {
  mpesa: {
    sms: { easy: 'MPESA-PROMO', medium: 'M-PESA', hard: 'MPESA' },
  },
  bank: {
    email: {
      easy: 'Bank Security <secure.alert.verify@gmail.com>',
      medium: 'Equity Bank <alerts@equity-bank-ke.com>',
      hard: 'Equity Online <security@equity-online-ke.com>',
    },
    sms: { easy: 'KCB-ALERT', medium: 'Equity', hard: 'Equity' },
  },
  safaricom: {
    email: {
      easy: 'Safaricom Promo <rewards@safaricom-win.net>',
      medium: 'Safaricom Care <care@safaricom-care.net>',
      hard: 'Safaricom Customer Care <care@safaricom-support.net>',
    },
    sms: { easy: 'BONGA', medium: 'Safaricom', hard: 'Safaricom' },
  },
  kra: {
    email: {
      easy: 'KRA Refunds <refund.kra.online@gmail.com>',
      medium: 'Kenya Revenue Authority <itax@kra-notices.com>',
      hard: 'Kenya Revenue Authority <compliance@kra-go.ke.com>',
    },
  },
  invoice: {
    email: {
      easy: 'Accounts <billing.invoice2291@gmail.com>',
      medium: 'Accounts Receivable <accounts@supplier-ke.com>',
      hard: 'Accounts Receivable <accounts@supp1ier-ke.com>',
    },
  },
  'it-support': {
    email: {
      easy: 'IT Team <help.desk.reset@gmail.com>',
      medium: 'Service Desk <support@m365-helpdesk.net>',
      hard: 'IT Service Desk <it-helpdesk@m365-support.net>',
    },
  },
  'hr-payroll': {
    email: {
      easy: 'HR <payroll.bonus.hr@gmail.com>',
      medium: 'Human Resources <hr@company-payroll.net>',
      hard: 'Payroll Office <payroll@hr-portal-ke.com>',
    },
  },
  delivery: {
    sms: { easy: 'PARCEL', medium: 'Posta', hard: 'G4S' },
  },
  'ceo-fraud': {
    email: {
      easy: 'The MD <md.urgent.request@gmail.com>',
      medium: 'Managing Director <md@company-exec.net>',
      hard: 'James Mwangi (MD) <jmwangi@company-md.co.ke>',
    },
  },
  sacco: {
    email: {
      easy: 'SACCO <dividend.payout.sacco@gmail.com>',
      medium: 'SACCO Credit Office <credit@sacco-ke.org>',
      hard: 'Member Services <members@sacco-ke.org>',
    },
    sms: { easy: 'DIVIDEND', medium: 'SACCO', hard: 'SACCO' },
  },
};

// Returns the display sender for a category/channel/difficulty, or null.
export function senderFor(category, channel, difficulty = 'medium') {
  return SENDERS[category]?.[channel]?.[difficulty] || null;
}

// Believable, theme-matching link text for email lures. The visible text looks
// like a branded URL; the real href is always the tracking token ({{.URL}}), so
// the mismatch is the tell. Graded like the senders: easy = obviously off,
// medium = plausible, hard = near-miss look-alike.
export const LINK_URLS = {
  bank: {
    easy: 'http://account-unlock-secure.com/login',
    medium: 'https://secure.equity-bank-ke.com/verify',
    hard: 'https://online.equity-online-ke.com/secure/verify',
  },
  safaricom: {
    easy: 'http://safaricom-win-prize.net/claim',
    medium: 'https://care.safaricom-care.net/verify',
    hard: 'https://care.safaricom-support.net/account',
  },
  kra: {
    easy: 'http://kra-refund-portal.com/claim',
    medium: 'https://itax.kra-online.co.ke/confirm-pin',
    hard: 'https://itax.kra-go.ke.com/compliance',
  },
  invoice: {
    easy: 'http://invoice-pay-now.com/settle',
    medium: 'https://accounts.supplier-ke.com/invoices',
    hard: 'https://accounts.supp1ier-ke.com/invoices/INV-2291',
  },
  'it-support': {
    easy: 'http://mail-login-security-update.com/keep',
    medium: 'https://storage.m365-helpdesk.net/request',
    hard: 'https://login.microsoftonline.m365-support.net/mfa',
  },
  'hr-payroll': {
    easy: 'http://staff-bonus-claim.com/confirm',
    medium: 'https://hr.company-portal-ke.net/salary',
    hard: 'https://payroll.hr-portal-ke.com/bank-details',
  },
  'ceo-fraud': {
    easy: 'http://urgent-gift-cards.com/buy',
    medium: 'https://company-exec.net/task',
    hard: 'https://secure-mail-ke.com/note/view',
  },
  sacco: {
    easy: 'http://sacco-dividend-claim.com/get',
    medium: 'https://members.sacco-ke.org/loan/confirm',
    hard: 'https://members.sacco-ke.org/record/confirm',
  },
};

// A believable URL to show as the link text, or null to fall back to a phrase.
export function linkUrlFor(category, difficulty = 'medium') {
  return LINK_URLS[category]?.[difficulty] || LINK_URLS[category]?.medium || null;
}

// Shared greeting/sign-off fragments reused across the email categories.
const greeting = {
  easy: ['Dear Customer,', 'Hello,'],
  medium: ['Dear Customer,', 'Dear Member,', 'Hello,'],
  hard: ['Hi {{.FirstName}},', 'Dear {{.FirstName}},', 'Hello {{.FirstName}},'],
};

export const banks = {
  mpesa: {
    label: 'M-Pesa',
    sms: {
      easy: {
        sender: ['MPESA', 'MPESA-PROMO'],
        hook: [
          'CONGRATULATIONS!!! You WON Ksh 50,000 in the MPESA customer promo.',
          'You have been selected for a MPESA cash reward of Ksh 45,000.',
        ],
        urgency: ['Claim now before it expire!', 'Offer end today!!'],
        cta: ['Click to claim', 'Get your money here'],
      },
      medium: {
        sender: ['MPESA', 'M-PESA Care'],
        hook: [
          'A reversal of Ksh 4,500 is pending on your line and will not reflect until you confirm it.',
          'Unusual activity was detected on your M-Pesa account and a short hold has been placed on it.',
        ],
        urgency: [
          'Confirm within 2 hours to keep the funds and lift the hold.',
          'Verify today to avoid temporary suspension of your line.',
        ],
        cta: ['Review the transaction', 'Verify your account'],
      },
      hard: {
        sender: ['MPESA'],
        hook: [
          'A payment of Ksh 4,500 to your line was flagged during our routine reconciliation.',
          'Your M-Pesa mini-statement for this month is ready and needs a short confirmation.',
        ],
        urgency: [
          'Confirm it was yours to avoid a hold while we complete the review.',
          'Please confirm to finalise the monthly reconciliation on your account.',
        ],
        cta: ['Confirm transaction', 'Review my statement'],
      },
    },
  },

  bank: {
    label: 'Bank',
    sms: {
      easy: {
        sender: ['EQUITY', 'KCB-ALERT'],
        hook: ['Your account is BLOCKED!', 'ALERT: your ATM card is deactivated.'],
        urgency: ['Reactivate now or lose access!', 'Act now!!'],
        cta: ['Unlock here', 'Reactivate card'],
      },
      medium: {
        sender: ['Equity', 'KCB', 'Co-op Bank'],
        hook: [
          'Your account was temporarily locked after a sign-in from a device we did not recognise.',
          'A transaction of Ksh 23,900 on your account is awaiting your confirmation before it clears.',
        ],
        urgency: [
          'Restore access now to avoid a hold on your transfers.',
          'Confirm within 1 hour, for your security.',
        ],
        cta: ['Restore access', 'Confirm transaction'],
      },
      hard: {
        sender: ['Equity', 'KCB'],
        hook: [
          'Two transactions on your account need confirmation before they can clear today.',
          'A standing order on your account is due for its annual renewal confirmation.',
        ],
        urgency: [
          'Online access stays limited until this is resolved.',
          'Please confirm to avoid any delay to your payments.',
        ],
        cta: ['Review transactions', 'Confirm details'],
      },
    },
    email: {
      easy: {
        subject: ['YOUR ACCOUNT IS BLOCKED', 'Urgent: card deactivated'],
        hook: ['Your bank account has been BLOCK due to security reason.', 'We have deactivate your card for security.'],
        detail: [
          'You must verify you identity now or all you funds will be lost permanent. This is final warning from the bank security department.',
        ],
        urgency: ['Click now or you lose your money!', 'Reactivate immediately before 24hrs!'],
        cta: ['Unlock my account', 'Reactivate now'],
        signoff: ['Bank Security', 'Online Banking Team'],
      },
      medium: {
        subject: ['Action needed on your account', 'Confirm a recent transaction'],
        hook: [
          'We noticed a sign-in to your online banking from a new device earlier today.',
          'A recent transaction of Ksh 23,900 on your account needs your confirmation before it clears.',
        ],
        detail: [
          'As a precaution we have temporarily limited some features on your account. Once you confirm the activity below, full access is restored automatically and no further action is needed.',
          'If you recognise this activity, a quick confirmation is all we need. If you do not, confirming lets us stop it and secure your account right away.',
        ],
        urgency: [
          'For your protection, access is limited until you confirm.',
          'Please confirm within 24 hours so your account is not placed on hold.',
        ],
        cta: ['Review my account', 'Confirm transaction'],
        signoff: ['Customer Operations', 'Digital Banking'],
      },
      hard: {
        subject: ['Your account statement needs review', 'Confirmation required: two transactions'],
        hook: [
          'During a routine security review of your account we found two transactions that need your confirmation before they are cleared.',
          'Your latest statement shows a small number of items that require confirmation before month-end.',
        ],
        detail: [
          'This is a standard check and takes under a minute. Online access remains available for everyday use, but the transactions below will not clear until you confirm the ones you recognise. If any look unfamiliar, confirming lets us hold them for you.',
          'We carry out these reviews periodically to keep your account secure. No charges apply, and nothing changes on your account until you have confirmed the items listed on the secure page.',
        ],
        urgency: [
          'Online access is limited until this is resolved, for your protection.',
          'Kindly confirm so there is no delay to your account this month.',
        ],
        cta: ['Review my transactions', 'Confirm and continue'],
        signoff: ['Customer Operations', 'Relationship Management'],
      },
    },
  },

  safaricom: {
    label: 'Safaricom',
    sms: {
      easy: {
        sender: ['SAFARICOM', 'BONGA'],
        hook: ['You WON 1GB free data and Ksh 2,000 airtime!', 'Your line qualify for a FREE smartphone.'],
        urgency: ['Claim before midnight!', 'Hurry offer ending!!'],
        cta: ['Claim gift', 'Collect now'],
      },
      medium: {
        sender: ['Safaricom', 'Bonga'],
        hook: [
          'Your 12,400 Bonga Points expire today and will be forfeited if not redeemed.',
          'Your line is due for a loyalty reward worth Ksh 3,000 in airtime and data.',
        ],
        urgency: [
          'Redeem before midnight to avoid losing them.',
          'Confirm your details to receive your reward.',
        ],
        cta: ['Redeem points', 'Claim reward'],
      },
      hard: {
        sender: ['Safaricom'],
        hook: [
          'Your Bonga Points balance is ready for the quarterly statement and needs confirming.',
          'Your tariff is due for its annual confirmation to keep your current rates.',
        ],
        urgency: [
          'Please confirm your details to keep your points active.',
          'Confirm to continue on your current plan without changes.',
        ],
        cta: ['Confirm my points', 'Confirm my plan'],
      },
    },
    email: {
      easy: {
        subject: ['YOU WON A PRIZE', 'Free data waiting'],
        hook: ['Congratulation you have WON a Safaricom prize of Ksh 100,000.', 'You have free data waiting to be claim on you line.'],
        detail: ['To receive you prize you must confirm you details now and pay small processing fee. Do not share this message with anyone.'],
        urgency: ['Claim now before it gone!', 'Offer expire today only!'],
        cta: ['Claim my prize', 'Get free data'],
        signoff: ['Safaricom Promo', 'Rewards Team'],
      },
      medium: {
        subject: ['Verify your Safaricom account', 'Your reward is waiting'],
        hook: [
          'We detected unusual activity on your Safaricom account linked to this email.',
          'A loyalty reward is available on your account and is ready to be released.',
        ],
        detail: [
          'To protect your account, some services have been temporarily limited. Verifying your details confirms you are the account holder and restores everything right away.',
          'Rewards are released once we confirm the account holder. The process is quick and your details are only used to verify this reward.',
        ],
        urgency: [
          'Verify your details to avoid suspension of your line.',
          'Confirm to receive your reward before it expires.',
        ],
        cta: ['Verify my account', 'Claim reward'],
        signoff: ['Safaricom Customer Care', 'Safaricom'],
      },
      hard: {
        subject: ['Confirm your account details', 'Annual account confirmation'],
        hook: [
          'As part of our annual account review, please confirm the details we hold on file for you.',
          'Your account is due for its yearly confirmation, which keeps your line and services active.',
        ],
        detail: [
          'This review helps us keep our records accurate and your line secure. It takes less than a minute and there is nothing to pay. Your services continue as normal while you complete it.',
          'We run this confirmation once a year for every customer. Simply check that your details are correct on the secure page and confirm; if anything has changed you can update it there.',
        ],
        urgency: [
          'This keeps your line and services active without interruption.',
          'Please confirm at your earliest convenience.',
        ],
        cta: ['Confirm my details', 'Complete confirmation'],
        signoff: ['Safaricom Customer Care', 'Account Services'],
      },
    },
  },

  kra: {
    label: 'KRA',
    email: {
      easy: {
        subject: ['TAX REFUND WAITING', 'You have a refund'],
        hook: ['KRA owe you a tax refund of Ksh 18,400 from last year.', 'Your tax refund is ready to be pay to you account.'],
        detail: ['To receive you refund you must confirm you bank details and PIN now. This refund will be cancel if you do not respond today.'],
        urgency: ['Claim now or it expire!', 'Provide details immediately!'],
        cta: ['Claim my refund', 'Get refund'],
        signoff: ['KRA Refunds', 'Tax Office'],
      },
      medium: {
        subject: ['iTax: confirm your PIN details', 'KRA compliance notice'],
        hook: [
          'As part of the latest iTax system update, all taxpayers are required to confirm the details on their PIN.',
          'Our records show a compliance item on your PIN that needs to be resolved.',
        ],
        detail: [
          'Accounts that are not confirmed before the deadline may experience delays in tax clearance and certificate processing. The confirmation is short and does not change your filing history.',
          'This notice is part of a routine compliance exercise. Confirming your details ensures your PIN remains active and in good standing with the Authority.',
        ],
        urgency: [
          'Accounts not confirmed may face delays in clearance.',
          'Please resolve this to remain compliant.',
        ],
        cta: ['Confirm my PIN', 'Resolve now'],
        signoff: ['Kenya Revenue Authority', 'iTax Support'],
      },
      hard: {
        subject: ['Action required: compliance review on your PIN', 'KRA: confirm filing details'],
        hook: [
          'A routine compliance review has flagged an item on your PIN that requires a short confirmation.',
          'Your most recent filing requires a brief confirmation before it can be finalised.',
        ],
        detail: [
          'This is a standard review and does not indicate a problem with your past filings. Confirming the flagged item now avoids any penalty or a temporary hold on your compliance certificate while the matter is open.',
          'The confirmation is handled entirely through the secure iTax page and takes about a minute. Your filing records are not altered; we only need you to verify the details shown.',
        ],
        urgency: [
          'Resolving this now avoids penalties or a hold on your certificate.',
          'Please confirm to complete your filing.',
        ],
        cta: ['Review my PIN', 'Confirm filing'],
        signoff: ['Kenya Revenue Authority', 'Domestic Taxes Department'],
      },
    },
  },

  invoice: {
    label: 'Invoice',
    email: {
      easy: {
        subject: ['INVOICE OVERDUE PAY NOW', 'Payment required'],
        hook: ['Your invoice is OVERDUE and must be pay today.', 'We have not receive your payment for last order.'],
        detail: ['If payment is not make immediately you service will be disconnect and the matter send to debt collector. Pay to the account in the attach file now.'],
        urgency: ['Pay now to avoid disconnection!', 'Immediate payment require!'],
        cta: ['Pay invoice', 'Settle now'],
        signoff: ['Accounts', 'Billing'],
      },
      medium: {
        subject: ['Invoice #INV-2291 for your approval', 'Overdue invoice notice'],
        hook: [
          'Please find the invoice for last month’s supply, which is ready for your approval.',
          'The attached invoice (INV-2291) is now overdue and awaiting processing.',
        ],
        detail: [
          'This covers the delivery completed at the end of last month. Approving it in this week’s payment run keeps the supplier account in good standing and avoids a late-payment follow-up.',
          'The amount and purchase-order reference are shown on the invoice. Once approved it will be included in the next scheduled payment run.',
        ],
        urgency: [
          'Kindly approve it for this week’s payment run.',
          'Please review to avoid a service interruption.',
        ],
        cta: ['View invoice', 'Review invoice'],
        signoff: ['Accounts Receivable', 'Finance Team'],
      },
      hard: {
        subject: ['Updated payment details for invoice INV-2291', 'Invoice approval before the payment run'],
        hook: [
          'Following a recent change to our banking, please use the updated details on the attached invoice.',
          'The invoice below is ready for your approval ahead of Friday’s payment run.',
        ],
        detail: [
          'Our previous account has been closed as part of a move to a new bank, so this invoice reflects the new details. Everything else — amount, reference and terms — is unchanged from our usual arrangement. Processing it with the updated details avoids the payment bouncing back.',
          'The purchase-order reference matches your records from last month. If you process supplier payments in batches, including this one before Friday keeps us within the agreed terms and avoids a reminder.',
        ],
        urgency: [
          'Processing it before the run avoids a delay to the supplier.',
          'Kindly review so we can schedule payment on time.',
        ],
        cta: ['Review invoice', 'Approve payment'],
        signoff: ['Accounts Receivable', 'Supplier Relations'],
      },
    },
  },

  'it-support': {
    label: 'IT support',
    email: {
      easy: {
        subject: ['Your password expire today!!', 'Account will be delete'],
        hook: ['Your email password is EXPIRE today at midnight.', 'Your mailbox will be DELETE soon due to inactive.'],
        detail: ['To keep you account you must login now and confirm you password. Failure to do this will result in permanent lose of all you emails.'],
        urgency: ['Update now or you loose access!', 'Act immediately!'],
        cta: ['Keep my password', 'Save my account'],
        signoff: ['IT Team', 'Support'],
      },
      medium: {
        subject: ['Action needed: your mailbox is almost full', 'Password reset required'],
        hook: [
          'Your mailbox has reached 98% of its storage limit.',
          'Our records show your account password is due for its scheduled reset.',
        ],
        detail: [
          'Once your mailbox is full you will stop receiving new messages, and senders may get a bounce-back. Requesting additional storage now prevents any interruption to your email.',
          'This is part of our routine security schedule. Resetting your password now keeps your access active and avoids a forced reset during working hours.',
        ],
        urgency: [
          'Once full you will stop receiving new messages.',
          'Please update it to keep your access.',
        ],
        cta: ['Request more storage', 'Reset my password'],
        signoff: ['Service Desk', 'IT Support'],
      },
      hard: {
        subject: ['Re-enrol your multi-factor authentication', 'Scheduled account verification'],
        hook: [
          'Following this week’s mailbox migration, staff in {{.Position}} roles are asked to re-enrol multi-factor authentication.',
          'A scheduled verification is required on your account as part of routine identity maintenance.',
        ],
        detail: [
          'The migration has moved your mailbox to the new platform, and the old sign-in method will be retired on Monday. Re-enrolling now, while you are signed in, takes about a minute and prevents a lockout when the switch-over completes.',
          'This affects a group of accounts in your department and is being rolled out in stages. Completing the short verification keeps your access working through the change with no further steps on your side.',
        ],
        urgency: [
          'Please complete it today to avoid a lockout on Monday.',
          'This takes about a minute and keeps your access active.',
        ],
        cta: ['Re-enrol my MFA', 'Verify my account'],
        signoff: ['IT Service Desk', 'Identity Team'],
      },
    },
  },

  'hr-payroll': {
    label: 'HR / payroll',
    email: {
      easy: {
        subject: ['BONUS WAITING FOR YOU', 'Salary increase approved'],
        hook: ['You have a bonus of Ksh 20,000 waiting in you name.', 'Your salary increase has been approve by management.'],
        detail: ['To receive the money you must confirm you bank details now using the link. Do not tell you colleagues as this is a special reward.'],
        urgency: ['Confirm details now to receive it!', 'Act today!'],
        cta: ['Claim my bonus', 'Confirm now'],
        signoff: ['HR', 'Payroll'],
      },
      medium: {
        subject: ['Updated salary structure - review required', 'Payslip available'],
        hook: [
          'HR has published the updated salary structure, effective from next month.',
          'Your latest payslip is now available for review in the staff portal.',
        ],
        detail: [
          'The revised structure affects allowances and grading across several roles. Please review the document and confirm you have seen it so we can note it against your record.',
          'Payslips are issued through the portal each month. Signing in to confirm receipt keeps your records current and lets you raise any query before the pay date.',
        ],
        urgency: [
          'Please review and confirm receipt.',
          'Kindly confirm so our records are current.',
        ],
        cta: ['Review my salary structure', 'View my payslip'],
        signoff: ['Human Resources', 'HR Office'],
      },
      hard: {
        subject: ['Confirm your bank details before this month’s payroll', 'Payroll verification for your record'],
        hook: [
          'We are finalising this month’s payroll and our records show your bank details may be out of date.',
          'A short verification is needed on your payroll record before salaries are processed.',
        ],
        detail: [
          'Payroll closes on Thursday. If the account on file is out of date your salary could be returned and delayed by several days while it is corrected. Confirming the details now ensures your pay reaches the right account on time.',
          'This is a routine check carried out before each pay run for a small group of records flagged by the system. It takes under a minute and only asks you to confirm the details we already hold.',
        ],
        urgency: [
          'Please confirm before Thursday so your salary is not delayed.',
          'Confirming now keeps your pay on schedule.',
        ],
        cta: ['Confirm my bank details', 'Verify my record'],
        signoff: ['Payroll Office', 'Human Resources'],
      },
    },
  },

  delivery: {
    label: 'Delivery',
    sms: {
      easy: {
        sender: ['DELIVERY', 'PARCEL'],
        hook: ['you have 1 parcel waiting at our depot.', 'your package could not be deliver today.'],
        urgency: ['pay small fee of Ksh 150 to release it now.', 'confirm now or it is return to sender!'],
        cta: ['release my parcel', 'pay here'],
      },
      medium: {
        sender: ['G4S', 'Posta', 'Sendy'],
        hook: [
          'We attempted delivery of your parcel today but the address on file was incomplete.',
          'Your parcel is being held pending confirmation of your delivery address.',
        ],
        urgency: [
          'Confirm your details to reschedule delivery.',
          'Update within 24 hours to avoid a return to sender.',
        ],
        cta: ['Confirm delivery', 'Reschedule'],
      },
      hard: {
        sender: ['G4S', 'Aramex'],
        hook: [
          'Your shipment is out for delivery and needs a short delivery-window confirmation.',
          'A parcel addressed to you is at the depot awaiting pickup confirmation.',
        ],
        urgency: [
          'Please confirm so the courier can complete delivery.',
          'Confirm to avoid a second failed attempt.',
        ],
        cta: ['Confirm delivery', 'Confirm pickup'],
      },
    },
  },

  'ceo-fraud': {
    label: 'CEO / exec',
    email: {
      easy: {
        subject: ['URGENT DO THIS NOW', 'need your help fast'],
        hook: ['I need you to buy gift cards for a client NOW.', 'send payment urgently I am busy in meeting.'],
        detail: ['Buy 5 gift cards of Ksh 10,000 each and send me the codes. Do not tell anyone in the office, it is a surprise for the client.'],
        urgency: ['do not tell anyone, do it fast!', 'reply immediately!'],
        cta: ['Open task', 'Do it now'],
        signoff: ['The MD', 'CEO'],
      },
      medium: {
        subject: ['Quick task', 'Are you around?'],
        hook: [
          'I need you to handle a quick payment for me before a meeting.',
          'Can you take care of something for me while I am tied up this afternoon?',
        ],
        detail: [
          'It is for a supplier we are onboarding and it is a little time-sensitive. I am in and out of meetings so email is easiest — please do not call. I will send the details once you confirm you can do it.',
          'Nothing complicated, I just cannot get to it myself today. Let me know you are free and I will forward what you need. Keep it between us for now until it is finalised.',
        ],
        urgency: [
          'It is a bit time-sensitive, please do not call.',
          'Reply here, I cannot take calls right now.',
        ],
        cta: ['See the details', 'Open the note'],
        signoff: ['Sent from my phone', 'Regards'],
      },
      hard: {
        subject: ['Are you at your desk?', 'A quick confidential matter'],
        hook: [
          'I am going into a meeting and need you to handle something time-sensitive for me.',
          'Please keep this between us for now; I will explain fully shortly.',
        ],
        detail: [
          'We are closing a deal and I need a payment prepared before I am out. Because it is still confidential, please deal with me directly on email rather than looping in the wider team for now. I will approve everything on my side once you have the details ready.',
          'I know this is short notice. I would do it myself but I will be off calls for the next couple of hours. Reply here and I will walk you through it step by step from the meeting.',
        ],
        urgency: [
          'Use the secure note below; do not call, I cannot take calls right now.',
          'Reply here and I will guide you from the meeting.',
        ],
        cta: ['Open secure note', 'View the request'],
        signoff: ['Sent from my phone', 'Thanks'],
      },
    },
  },

  sacco: {
    label: 'SACCO',
    sms: {
      easy: {
        sender: ['SACCO', 'DIVIDEND'],
        hook: ['Your SACCO dividend of Ksh 60,000 is ready!', 'You have a loan pre-approve of Ksh 200,000!'],
        urgency: ['update details now to receive it!', 'claim before it expire!'],
        cta: ['get my money', 'claim now'],
      },
      medium: {
        sender: ['SACCO', 'Credit Office'],
        hook: [
          'Your SACCO dividend for 2025 is ready for disbursement to your account.',
          'Your loan application has been received and is awaiting final details.',
        ],
        urgency: [
          'Update your payout details to receive it.',
          'Confirm your details to proceed with processing.',
        ],
        cta: ['Update payout', 'Confirm details'],
      },
      hard: {
        sender: ['SACCO'],
        hook: [
          'Your annual dividend statement is ready and needs a short confirmation.',
          'Your membership record is due for its yearly update to stay active.',
        ],
        urgency: [
          'Please confirm your payout details to complete disbursement.',
          'Confirm to keep your membership active.',
        ],
        cta: ['Confirm payout details', 'Update my record'],
      },
    },
    email: {
      easy: {
        subject: ['DIVIDEND READY CLAIM NOW', 'Loan approved'],
        hook: ['Your dividend of Ksh 60,000 is ready, claim it now.', 'Your loan of Ksh 200,000 has been approve.'],
        detail: ['To receive the money confirm you member number and bank details using the link below. This offer is only valid for today.'],
        urgency: ['confirm details to receive money!', 'act now!'],
        cta: ['Claim dividend', 'Get my loan'],
        signoff: ['SACCO', 'Credit Office'],
      },
      medium: {
        subject: ['Your loan application has been approved', 'Dividend disbursement'],
        hook: [
          'Good news — your loan application has been approved by the credit committee.',
          'Your annual dividend is ready for disbursement to your registered account.',
        ],
        detail: [
          'Before the funds are released we need to confirm the membership and payout details we hold for you. This is a standard step and protects your account from misdirected payments.',
          'Disbursements are made to the account on your membership record. Please confirm the details are current so the payout is not delayed.',
        ],
        urgency: [
          'Confirm your membership details to release the funds.',
          'Please confirm your details to proceed.',
        ],
        cta: ['Confirm and receive funds', 'Confirm membership'],
        signoff: ['SACCO Credit Office', 'Member Services'],
      },
      hard: {
        subject: ['Annual membership confirmation', 'Confirm your dividend payout'],
        hook: [
          'Your membership record is due for its annual confirmation.',
          'Your dividend statement is ready and needs a short confirmation before payout.',
        ],
        detail: [
          'This yearly confirmation keeps your account and payout details accurate. It takes under a minute and does not change your savings or loan balances; we simply ask you to verify the details on file.',
          'Confirming now ensures your dividend reaches the correct account and that your membership stays in good standing for the coming year.',
        ],
        urgency: [
          'Confirming keeps your account and payouts up to date.',
          'Please confirm so we can complete disbursement.',
        ],
        cta: ['Confirm my record', 'Confirm payout details'],
        signoff: ['Member Services', 'SACCO Credit Office'],
      },
    },
  },
};

// Shared greeting bank, exported for the generator.
export const greetings = greeting;
