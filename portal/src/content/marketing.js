// Marketing copy shared by the landing and auth pages.

export const HEADLINE = {
  lead: 'Train your people.',
  accent: 'Stop the next attack.',
};

export const AUTH_BENEFITS = [
  'M-Pesa, KRA and Safaricom scams over email and SMS',
  'A 0–100 vulnerability score for every employee',
  'Training assigned automatically when someone clicks',
];

export const HERO = {
  badge: 'Built for Kenyan organisations',
  subheading:
    'Simulate realistic M-Pesa, KRA and Safaricom scams over email and SMS, measure who’s vulnerable, and train them automatically.',
  reassurance: ['Kenya-specific templates', 'Email + SMS simulations', 'Adaptive training'],
};

export const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#threats', label: 'Threats' },
  { href: '#features', label: 'Features' },
  { href: '#why', label: 'Why RedFlag' },
];

// Problem strip. Only figures from the project proposal belong here — never invented numbers.
// Entries without a value are skipped by the page.
export const PROBLEM_STATS = [
  {
    value: '45%+',
    caption: 'of successful cyber attacks in Kenya involve a human element',
    // TODO: verify citation — exact report title, year and page from the proposal.
    source: 'Communications Authority of Kenya',
  },
  // TODO: add the second and third figures from the proposal (value, caption, source). Do not invent statistics.
];

export const STEPS = [
  {
    title: 'Simulate',
    body: 'Launch realistic phishing emails through the Gophish engine and smishing texts through Africa’s Talking.',
  },
  {
    title: 'Measure',
    body: 'A logistic-regression model turns every open, click and report into a 0–100 vulnerability score.',
  },
  {
    title: 'Train',
    body: 'Anyone who takes the bait gets adaptive remedial training with a short quiz to confirm it stuck.',
  },
];

export const THREATS = [
  {
    name: 'M-Pesa Alert',
    channel: 'SMS',
    difficulty: 'Medium',
    sender: 'MPESA',
    preview:
      'Confirmed. Ksh 4,500 reversal pending. Verify your PIN to receive funds: mpesa-reversal.co',
  },
  {
    name: 'KRA Notice',
    channel: 'Email',
    difficulty: 'Hard',
    sender: 'iTax Compliance <notice@kra-itax.info>',
    preview:
      'Your iTax return has a penalty of Ksh 20,000. Settle before Friday to avoid enforcement.',
  },
  {
    name: 'Safaricom Care',
    channel: 'SMS',
    difficulty: 'Easy',
    sender: 'SAFARICOM',
    preview:
      'Dear customer, your line will be suspended in 24hrs. Update your details at safcom-care.net',
  },
  {
    name: 'Invoice Fraud',
    channel: 'Email',
    difficulty: 'Hard',
    sender: 'Accounts <billing@supplier-ke.co>',
    preview:
      'Please find the overdue invoice attached. Our bank details have changed, kindly remit today.',
  },
];

export const FEATURES = [
  {
    key: 'email',
    title: 'Email simulations',
    body: 'Gophish-powered phishing with tracked opens, clicks and submissions.',
  },
  {
    key: 'sms',
    title: 'SMS simulations',
    body: 'Smishing via Africa’s Talking, the channel most Kenyan scams use.',
  },
  {
    key: 'score',
    title: 'Predictive risk scoring',
    body: 'Logistic regression flags who is most likely to fall for the next one.',
  },
  {
    key: 'training',
    title: 'Adaptive training',
    body: 'Short modules and quizzes assigned the moment someone clicks.',
  },
  {
    key: 'analytics',
    title: 'Analytics dashboard',
    body: 'Department trends, campaign funnels and exportable reports.',
  },
  {
    key: 'privacy',
    title: 'Multi-organisation privacy',
    body: 'Each organisation’s data is isolated; employees only see their own.',
  },
];

export const COMPARISON = [
  { row: 'Kenya-specific templates (M-Pesa, KRA, Safaricom)', redflag: true, global: false },
  { row: 'SMS (smishing) simulation', redflag: true, global: false },
  { row: 'Predictive vulnerability scoring', redflag: true, global: false },
  { row: 'Adaptive remedial training', redflag: true, global: true },
  { row: 'Affordable for Kenyan SMEs', redflag: true, global: false },
];

export const CTA = {
  headline: 'See who’s vulnerable before an attacker does.',
  body: 'Set up your organisation in minutes and run your first simulation today.',
};

export const FOOTER = {
  blurb:
    'Phishing and smishing simulation with predictive risk scoring, built for Kenyan organisations.',
  credit: 'Strathmore University final-year project',
  columns: [
    { title: 'Product', links: ['How it works', 'Features', 'Templates', 'Pricing'] },
    { title: 'Company', links: ['About', 'Contact', 'Careers'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Data protection'] },
  ],
};
