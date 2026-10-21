// Phrase banks for the internal sample generator (no external AI / no network).
// The generator (generator.js) assembles complete lure messages by picking one
// fragment from each slot, so a handful of options per slot yields hundreds of
// realistic combinations per category/channel/difficulty — a renewable pool.
//
// Difficulty is encoded purely by which fragments a tier contains:
//   easy   - obvious tells: prizes, bad grammar, generic greeting, odd links.
//   medium - plausible branding and mild urgency, one subtle tell.
//   hard   - clean tone, personalisation tags ({{.FirstName}}/{{.Position}}),
//            near-miss domains.
// SMS bodies use {{link}} (engine-substituted). Email bodies use {{.URL}}.
// Every fragment here is human-written and reviewed; output is always safe.

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
        hook: ['CONGRATULATIONS!!! You WON Ksh 50,000 in the MPESA promo.', 'You have been selected for a MPESA cash reward of Ksh 45,000.'],
        urgency: ['Claim now before it expire!', 'Offer end today!!'],
        cta: ['Click to claim', 'Get your money here'],
      },
      medium: {
        sender: ['MPESA', 'M-PESA Care'],
        hook: ['A reversal of Ksh4,500 is pending on your line.', 'Unusual activity was detected on your M-Pesa account.'],
        urgency: ['Confirm within 2 hours to keep the funds.', 'Verify today to avoid temporary suspension.'],
        cta: ['Review the transaction', 'Verify now'],
      },
      hard: {
        sender: ['MPESA'],
        hook: ['A payment of Ksh4,500 to your line was flagged for review.', 'Your M-Pesa statement for this month is ready for confirmation.'],
        urgency: ['Confirm it was yours to avoid a hold on your account.', 'Please confirm to complete the monthly reconciliation.'],
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
        hook: ['Your account was temporarily locked after a login from a new device.', 'A transaction on your account needs your confirmation.'],
        urgency: ['Restore access to avoid a hold.', 'Confirm within 1 hour for your security.'],
        cta: ['Restore access', 'Confirm transaction'],
      },
      hard: {
        sender: ['Equity', 'KCB'],
        hook: ['Two transactions on your account need confirmation before they clear.', 'A standing order on your account is due for renewal.'],
        urgency: ['Online access is limited until this is resolved.', 'Please confirm to avoid any delay.'],
        cta: ['Review transactions', 'Confirm details'],
      },
    },
    email: {
      easy: {
        subject: ['YOUR ACCOUNT IS BLOCKED', 'Urgent: card deactivated'],
        hook: ['Your bank account has been BLOCK due to security.', 'We have deactivate your card.'],
        urgency: ['Click now or you lose your money!', 'Reactivate immediately!'],
        cta: ['Unlock my account', 'Reactivate now'],
        signoff: ['Bank Security', 'Online Banking Team'],
      },
      medium: {
        subject: ['Action needed on your account', 'Confirm a recent transaction'],
        hook: ['We noticed a login from a new device on your account.', 'A recent transaction on your account needs confirmation.'],
        urgency: ['For your protection, access is limited until you confirm.', 'Please confirm within 24 hours.'],
        cta: ['Review my account', 'Confirm transaction'],
        signoff: ['Customer Operations', 'Digital Banking'],
      },
      hard: {
        subject: ['Your account statement needs review', 'Confirmation required: two transactions'],
        hook: ['During a routine security review we found two transactions that need your confirmation before they are cleared.', 'Your latest statement shows items that require confirmation.'],
        urgency: ['Online access is limited until this is resolved, for your protection.', 'Kindly confirm so there is no delay to your account.'],
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
        hook: ['Your 12,400 Bonga Points expire today.', 'Your line is due for a loyalty reward.'],
        urgency: ['Redeem before midnight to avoid losing them.', 'Confirm to receive your reward.'],
        cta: ['Redeem points', 'Claim reward'],
      },
      hard: {
        sender: ['Safaricom'],
        hook: ['Your Bonga Points balance is ready for the quarterly statement.', 'Your tariff is due for its annual confirmation.'],
        urgency: ['Please confirm your details to keep your points active.', 'Confirm to continue on your current plan.'],
        cta: ['Confirm my points', 'Confirm my plan'],
      },
    },
    email: {
      easy: {
        subject: ['YOU WON A PRIZE', 'Free data waiting'],
        hook: ['Congratulation you have WON a Safaricom prize.', 'You have free data waiting to be claim.'],
        urgency: ['Claim now before it gone!', 'Offer expire today!'],
        cta: ['Claim my prize', 'Get free data'],
        signoff: ['Safaricom Promo', 'Rewards Team'],
      },
      medium: {
        subject: ['Verify your Safaricom account', 'Your reward is waiting'],
        hook: ['We detected unusual activity on your Safaricom account.', 'A loyalty reward is available on your account.'],
        urgency: ['Verify your details to avoid suspension.', 'Confirm to receive your reward.'],
        cta: ['Verify my account', 'Claim reward'],
        signoff: ['Safaricom Customer Care', 'Safaricom'],
      },
      hard: {
        subject: ['Confirm your account details', 'Annual account confirmation'],
        hook: ['As part of our annual review, please confirm the details on your account.', 'Your account is due for its yearly confirmation.'],
        urgency: ['This keeps your line and services active.', 'Please confirm at your earliest convenience.'],
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
        hook: ['KRA owe you a tax refund of Ksh 18,400.', 'Your tax refund is ready to be pay.'],
        urgency: ['Claim now or it expire!', 'Provide details immediately!'],
        cta: ['Claim my refund', 'Get refund'],
        signoff: ['KRA Refunds', 'Tax Office'],
      },
      medium: {
        subject: ['iTax: confirm your PIN details', 'KRA compliance notice'],
        hook: ['As part of the iTax update, all taxpayers must confirm their PIN details.', 'Our records show a compliance item on your PIN.'],
        urgency: ['Accounts not confirmed may face delays in clearance.', 'Please resolve this to stay compliant.'],
        cta: ['Confirm my PIN', 'Resolve now'],
        signoff: ['Kenya Revenue Authority', 'iTax Support'],
      },
      hard: {
        subject: ['Action required: compliance review on your PIN', 'KRA: confirm filing details'],
        hook: ['A routine compliance review flagged an item on your PIN that needs confirmation.', 'Your recent filing requires a short confirmation.'],
        urgency: ['Resolving this now avoids penalties or a hold on your certificate.', 'Please confirm to complete your filing.'],
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
        hook: ['Your invoice is OVERDUE and must be pay today.', 'We have not receive your payment.'],
        urgency: ['Pay now to avoid disconnection!', 'Immediate payment require!'],
        cta: ['Pay invoice', 'Settle now'],
        signoff: ['Accounts', 'Billing'],
      },
      medium: {
        subject: ['Invoice #INV-2291 for your approval', 'Overdue invoice notice'],
        hook: ['Please find the invoice for last month supply ready for approval.', 'The attached invoice is overdue for processing.'],
        urgency: ['Kindly approve it for this week payment run.', 'Please review to avoid a service interruption.'],
        cta: ['View invoice', 'Review invoice'],
        signoff: ['Accounts Receivable', 'Finance Team'],
      },
      hard: {
        subject: ['Updated payment details for invoice INV-2291', 'Invoice approval before the payment run'],
        hook: ['Following a change to our banking, please use the updated details on the attached invoice.', 'The invoice below is ready for your approval before Friday.'],
        urgency: ['Processing it before the run avoids a delay to the supplier.', 'Kindly review so we can schedule payment.'],
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
        hook: ['Your email password is EXPIRE today.', 'Your mailbox will be DELETE soon.'],
        urgency: ['Update now or you loose access!', 'Act immediately!'],
        cta: ['Keep my password', 'Save my account'],
        signoff: ['IT Team', 'Support'],
      },
      medium: {
        subject: ['Action needed: your mailbox is almost full', 'Password reset required'],
        hook: ['Your mailbox has reached 98% of its storage limit.', 'Our records show your password is due for a reset.'],
        urgency: ['Once full you will stop receiving new messages.', 'Please update it to keep your access.'],
        cta: ['Request more storage', 'Reset my password'],
        signoff: ['Service Desk', 'IT Support'],
      },
      hard: {
        subject: ['Re-enrol your multi-factor authentication', 'Scheduled account verification'],
        hook: ['Following this week migration, staff in {{.Position}} roles must re-enrol multi-factor authentication.', 'A scheduled verification is required for your account.'],
        urgency: ['Please complete it today to avoid a lockout on Monday.', 'This takes about a minute and keeps your access active.'],
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
        hook: ['You have a bonus of Ksh 20,000 waiting.', 'Your salary increase is approve.'],
        urgency: ['Confirm details now to receive it!', 'Act today!'],
        cta: ['Claim my bonus', 'Confirm now'],
        signoff: ['HR', 'Payroll'],
      },
      medium: {
        subject: ['Updated salary structure - review required', 'Payslip available'],
        hook: ['HR has published the updated salary structure effective next month.', 'Your latest payslip is available for review.'],
        urgency: ['Please review and confirm receipt.', 'Kindly confirm so our records are current.'],
        cta: ['Review my salary structure', 'View my payslip'],
        signoff: ['Human Resources', 'HR Office'],
      },
      hard: {
        subject: ['Confirm your bank details before this month payroll', 'Payroll verification for your record'],
        hook: ['We are finalising this month payroll and our records show your bank details may be out of date.', 'A short verification is needed on your payroll record.'],
        urgency: ['Please confirm before Thursday so your salary is not delayed.', 'Confirming now keeps your pay on schedule.'],
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
        hook: ['you have 1 parcel waiting.', 'your package could not be deliver.'],
        urgency: ['pay small fee of Ksh 150 to release it now.', 'confirm now or it is return!'],
        cta: ['release my parcel', 'pay here'],
      },
      medium: {
        sender: ['G4S', 'Posta', 'Sendy'],
        hook: ['We attempted delivery of your parcel but the address was incomplete.', 'Your parcel is held pending address confirmation.'],
        urgency: ['Confirm your details to reschedule.', 'Update within 24 hours to avoid return.'],
        cta: ['Confirm delivery', 'Reschedule'],
      },
      hard: {
        sender: ['G4S', 'Aramex'],
        hook: ['Your shipment is out for delivery and needs a delivery-window confirmation.', 'A parcel addressed to you is at the depot for pickup confirmation.'],
        urgency: ['Please confirm so the courier can complete delivery.', 'Confirm to avoid a second failed attempt.'],
        cta: ['Confirm delivery', 'Confirm pickup'],
      },
    },
  },

  'ceo-fraud': {
    label: 'CEO / exec',
    email: {
      easy: {
        subject: ['URGENT DO THIS NOW', 'need your help fast'],
        hook: ['I need you to buy gift cards for a client NOW.', 'send payment urgently I am busy.'],
        urgency: ['do not tell anyone, do it fast!', 'reply immediately!'],
        cta: ['Open task', 'Do it now'],
        signoff: ['The MD', 'CEO'],
      },
      medium: {
        subject: ['Quick task', 'Are you around?'],
        hook: ['I need you to handle a quick payment for me before a meeting.', 'Can you take care of something for me while I am tied up?'],
        urgency: ['It is a bit time-sensitive, please do not call.', 'Reply here, I cannot take calls now.'],
        cta: ['See the details', 'Open the note'],
        signoff: ['Sent from my phone', 'Regards'],
      },
      hard: {
        subject: ['Are you at your desk?', 'A quick confidential matter'],
        hook: ['I am going into a meeting and need you to handle something time-sensitive for me.', 'Please keep this between us for now; I will explain shortly.'],
        urgency: ['Use the secure note below, do not call, I cannot take calls right now.', 'Reply here and I will guide you from the meeting.'],
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
        hook: ['Your SACCO dividend of Ksh 60,000 is ready!', 'You have a loan pre-approve!'],
        urgency: ['update details now to receive it!', 'claim before it expire!'],
        cta: ['get my money', 'claim now'],
      },
      medium: {
        sender: ['SACCO', 'Credit Office'],
        hook: ['Your SACCO dividend for 2025 is ready for disbursement.', 'Your loan application has been received.'],
        urgency: ['Update your payout details to receive it.', 'Confirm your details to proceed.'],
        cta: ['Update payout', 'Confirm details'],
      },
      hard: {
        sender: ['SACCO'],
        hook: ['Your annual dividend statement is ready for confirmation.', 'Your membership record is due for its yearly update.'],
        urgency: ['Please confirm your payout details to complete disbursement.', 'Confirm to keep your membership active.'],
        cta: ['Confirm payout details', 'Update my record'],
      },
    },
    email: {
      easy: {
        subject: ['DIVIDEND READY CLAIM NOW', 'Loan approved'],
        hook: ['Your dividend is ready claim it now.', 'Your loan is approve.'],
        urgency: ['confirm details to receive money!', 'act now!'],
        cta: ['Claim dividend', 'Get my loan'],
        signoff: ['SACCO', 'Credit Office'],
      },
      medium: {
        subject: ['Your loan application has been approved', 'Dividend disbursement'],
        hook: ['Good news, your loan application has been approved.', 'Your dividend is ready for disbursement.'],
        urgency: ['Confirm your membership details to release the funds.', 'Please confirm your details to proceed.'],
        cta: ['Confirm and receive funds', 'Confirm membership'],
        signoff: ['SACCO Credit Office', 'Member Services'],
      },
      hard: {
        subject: ['Annual membership confirmation', 'Confirm your dividend payout'],
        hook: ['Your membership record is due for its annual confirmation.', 'Your dividend statement is ready and needs a short confirmation.'],
        urgency: ['Confirming keeps your account and payouts up to date.', 'Please confirm so we can complete disbursement.'],
        cta: ['Confirm my record', 'Confirm payout details'],
        signoff: ['Member Services', 'SACCO Credit Office'],
      },
    },
  },
};

// Shared greeting bank, exported for the generator.
export const greetings = greeting;
