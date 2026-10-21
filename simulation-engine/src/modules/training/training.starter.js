// Starter interactive modules an admin can add in one click, one per default template category.
// Lesson types: read (text + tips), spot (tap the red flags in a sample message),
// choice (pick the safest action, with feedback).

module.exports = [
  {
    title: 'Spotting fake M-Pesa alerts',
    category: 'mpesa',
    estimatedMinutes: 6,
    description: 'How fraudsters fake M-Pesa messages and how to check a real one.',
    lessons: [
      {
        type: 'read',
        title: 'Why M-Pesa is a target',
        body: [
          'Mobile money moves fast and is hard to reverse, so attackers copy the look of official M-Pesa messages.',
          'Real M-Pesa confirmations come from "MPESA" and quote a transaction code. They never ask you to open a link or share your PIN.',
        ],
        tips: [
          'Safaricom will never ask for your M-Pesa PIN.',
          'Check balances by dialling *334# instead of trusting a message.',
        ],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap every part of this sample SMS that should make you suspicious.',
        message: {
          channel: 'sms',
          from: '+254 7XX XXX 210',
          parts: [
            { text: 'M-PESA: ' },
            {
              text: 'Your account has been suspended',
              flag: 'Scare tactic. Real alerts do not threaten suspension by SMS.',
            },
            { text: ' due to unusual activity. ' },
            { text: 'Verify within 2 hours', flag: 'Artificial deadline to rush you.' },
            { text: ' at ' },
            {
              text: 'mpesa-verify-ke.co',
              flag: 'Unofficial web address. Safaricom does not send verification links.',
            },
          ],
        },
        senderFlag: 'Sent from an ordinary mobile number, not "MPESA".',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario:
          'You receive an SMS saying you were sent KES 3,500 "by mistake" and the sender asks you to send it back.',
        options: [
          {
            label: 'Send the money back straight away',
            correct: false,
            feedback: 'This is a common reversal scam. The original "deposit" is usually fake.',
          },
          {
            label: 'Check your real balance with *334#, and report the number to 333',
            correct: true,
            feedback: 'Right. Confirm with the official channel and report the fraud number.',
          },
          {
            label: 'Call the number back to ask questions',
            correct: false,
            feedback: 'Calling back lets them pressure you. Use official channels only.',
          },
        ],
      },
    ],
    quiz: [
      {
        question: 'Which message is most likely genuine?',
        options: [
          'An SMS from a mobile number asking you to verify your PIN',
          'An SMS from MPESA with a transaction code and no link',
          'An SMS saying your line will be blocked within 2 hours',
        ],
        correctIndex: 1,
      },
      {
        question: 'Where do you forward suspicious Safaricom SMS?',
        options: ['333', '100', '911'],
        correctIndex: 0,
      },
      {
        question: 'Someone claims they sent you money by mistake. What first?',
        options: ['Send it back', 'Check your balance via *334#', 'Share your PIN to verify'],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'KRA notices and tax scams',
    category: 'kra',
    estimatedMinutes: 7,
    description: 'Recognise fake KRA emails that use penalties and deadlines to rush you.',
    lessons: [
      {
        type: 'read',
        title: 'How the scam works',
        body: [
          'Fake KRA emails warn of penalties or refunds and link to a copy of the iTax login page to collect your PIN and password.',
          'KRA communicates from kra.go.ke addresses, and iTax is reached at itax.kra.go.ke. Type the address yourself.',
        ],
        tips: ['Hover over links to see where they really go.', 'Log in to iTax directly, never via an email link.'],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap every suspicious part of this sample email.',
        message: {
          channel: 'email',
          from: 'compliance@kra-notices.com',
          subject: 'URGENT: Penalty on your PIN',
          parts: [
            { text: 'Dear ' },
            { text: 'Taxpayer', flag: 'Generic greeting. KRA knows your name.' },
            { text: ', our records show an outstanding issue on your PIN. ' },
            {
              text: 'Failure to act within 48 hours will result in penalties.',
              flag: 'Pressure and threats to stop you thinking.',
            },
            { text: ' ' },
            {
              text: 'Click here to log in to iTax',
              flag: 'Login link in an email. Go to itax.kra.go.ke yourself.',
            },
          ],
        },
        senderFlag: 'The sender domain is not kra.go.ke.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'An email says you are owed a KRA refund and asks for your bank card details to pay it.',
        options: [
          {
            label: 'Reply with the card details to get the refund',
            correct: false,
            feedback: 'KRA never asks for card details by email.',
          },
          {
            label: 'Report it to IT and check your iTax account directly',
            correct: true,
            feedback: 'Correct. Report it and verify through the official portal.',
          },
          {
            label: 'Forward it to colleagues so they can claim too',
            correct: false,
            feedback: 'Forwarding spreads the attack. Report it instead.',
          },
        ],
      },
    ],
    quiz: [
      {
        question: 'Which address does real KRA email come from?',
        options: ['kra-notices.com', 'kra.go.ke', 'kra-ke.org'],
        correctIndex: 1,
      },
      {
        question: 'An email links to an iTax login. Best action?',
        options: ['Use the link', 'Type itax.kra.go.ke yourself', 'Reply asking if it is real'],
        correctIndex: 1,
      },
      {
        question: 'What is the strongest sign of a scam?',
        options: ['A logo', 'A 48-hour penalty threat with a login link', 'A footer address'],
        correctIndex: 1,
      },
    ],
  },
  {
    title: 'Safaricom account impersonation',
    category: 'safaricom',
    estimatedMinutes: 5,
    description: 'Fake account verification emails and how to report them.',
    lessons: [
      {
        type: 'read',
        title: 'Account verification lures',
        body: [
          'Attackers pretend there is a problem with your account and ask you to "verify" through a link.',
          'Genuine account changes are handled in the MySafaricom app or at a shop.',
        ],
        tips: ['Report suspicious messages using the Report button in RedFlag.'],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap every suspicious part of this sample email.',
        message: {
          channel: 'email',
          from: 'care@safaricom-support.net',
          subject: 'Action Required: Verify Your Account',
          parts: [
            { text: 'Dear ' },
            { text: 'Customer', flag: 'Generic greeting instead of your name.' },
            { text: ', we detected unusual activity. ' },
            { text: 'To avoid suspension', flag: 'Threat of losing access.' },
            { text: ', please ' },
            { text: 'verify your details here', flag: 'Asks you to enter details through a link.' },
            { text: '.' },
          ],
        },
        senderFlag: 'Look-alike domain: safaricom-support.net.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'You already clicked a suspicious link but did not type anything.',
        options: [
          { label: 'Ignore it, nothing happened', correct: false, feedback: 'Still report it so IT can check and warn others.' },
          { label: 'Close the page and report it to IT', correct: true, feedback: 'Right. Early reporting limits harm.' },
          { label: 'Enter details to see what happens', correct: false, feedback: 'Never enter details on a suspicious page.' },
        ],
      },
    ],
    quiz: [
      {
        question: 'Where should you manage your Safaricom account?',
        options: ['A link in an email', 'The MySafaricom app or a shop', 'A WhatsApp contact'],
        correctIndex: 1,
      },
      {
        question: 'You clicked a suspicious link. What next?',
        options: ['Report it to IT', 'Keep quiet', 'Forward it'],
        correctIndex: 0,
      },
    ],
  },
  {
    title: 'Invoice and payment fraud',
    category: 'invoice',
    estimatedMinutes: 6,
    description: 'Fake invoices and changed bank details aimed at finance teams.',
    lessons: [
      {
        type: 'read',
        title: 'Business email compromise',
        body: [
          'Attackers pose as suppliers or managers and ask for urgent payment or a change of bank details.',
          'Always confirm payment changes by calling a known number, not one in the email.',
        ],
        tips: ['Two people should approve any change of supplier bank details.'],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap every suspicious part of this sample email.',
        message: {
          channel: 'email',
          from: 'accounts@supp1ier-ke.com',
          subject: 'Overdue Invoice - Immediate Payment Required',
          parts: [
            { text: 'Hello, please find the overdue invoice. ' },
            { text: 'Our bank details have changed', flag: 'Changed bank details are a classic fraud sign.' },
            { text: ', so ' },
            { text: 'pay today to avoid service interruption', flag: 'Urgency and threat.' },
            { text: ' via ' },
            { text: 'this link', flag: 'Payment link from an unverified sender.' },
            { text: '.' },
          ],
        },
        senderFlag: 'Misspelt domain: "supp1ier" uses the number 1.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'Your "CEO" emails asking for an urgent transfer while they are travelling.',
        options: [
          { label: 'Pay quickly, it is the CEO', correct: false, feedback: 'Urgency from a senior name is a common trick.' },
          { label: 'Call the CEO on their known number to confirm', correct: true, feedback: 'Correct. Verify out of band.' },
          { label: 'Reply to the email to confirm', correct: false, feedback: 'Replying goes to the attacker.' },
        ],
      },
    ],
    quiz: [
      {
        question: 'A supplier emails new bank details. What do you do?',
        options: ['Update them', 'Call the supplier on a known number', 'Reply to confirm'],
        correctIndex: 1,
      },
      {
        question: 'Which sender looks suspicious?',
        options: ['accounts@supplier.co.ke', 'accounts@supp1ier-ke.com', 'Both look fine'],
        correctIndex: 1,
      },
    ],
  },
];
