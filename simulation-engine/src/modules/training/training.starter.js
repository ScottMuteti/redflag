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
      { question: 'Who is allowed to ask for your M-Pesa PIN?', options: ['A Safaricom agent on the phone', 'Nobody, ever', 'Customer care by SMS'], correctIndex: 1 },
      { question: 'An "M-Pesa" SMS comes from 0712 345 678. This means:', options: ['It is likely fake', 'It is a new official number', 'It is from your bank'], correctIndex: 0 },
      { question: 'A message says your line will be blocked unless you click a link. You:', options: ['Click quickly to keep the line', 'Forward it to 333 and ignore the link', 'Reply STOP'], correctIndex: 1 },
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
      { question: 'A "KRA refund" email asks for your bank card details. You:', options: ['Send them to get the refund', 'Ignore the link and check iTax directly', 'Reply with half the card number'], correctIndex: 1 },
      { question: 'Where do you confirm a KRA penalty is real?', options: ['By logging in to itax.kra.go.ke yourself', 'By calling the number in the email', 'By opening the attachment'], correctIndex: 0 },
      { question: 'A KRA email attachment is named "Notice.pdf.exe". It is:', options: ['A normal PDF', 'Malware disguised as a document', 'An encrypted KRA file'], correctIndex: 1 },
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
      { question: 'An email from safaricom-care.net asks you to verify your account. It is:', options: ['Official', 'Suspicious, the domain is not safaricom.co.ke', 'Fine if it has the logo'], correctIndex: 1 },
      { question: 'You typed your password on a fake Safaricom page. First step?', options: ['Change the password and tell IT', 'Wait and see', 'Delete the email'], correctIndex: 0 },
      { question: 'A caller says they are Safaricom and need the code just sent to you. You:', options: ['Read it out', 'Hang up, the code is only for you', 'Send it by SMS instead'], correctIndex: 1 },
      { question: 'What does a real Safaricom message never do?', options: ['Mention your number', 'Ask for your PIN or password', 'Give a customer care line'], correctIndex: 1 },
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
      { question: 'An invoice is marked "pay today or lose the discount". This is:', options: ['Normal pressure', 'A pressure tactic worth checking', 'Proof it is genuine'], correctIndex: 1 },
      { question: 'Before paying a first invoice from a new supplier, you should:', options: ['Pay it to build trust', 'Confirm the supplier and order through procurement', 'Ask the sender if it is real'], correctIndex: 1 },
      { question: 'A known supplier\'s email asks you to "keep this change confidential". You:', options: ['Report it and verify by phone', 'Keep it quiet as asked', 'Forward it to all of finance'], correctIndex: 0 },
      { question: 'Which invoice detail is most worth double-checking?', options: ['The company logo', 'The bank account number', 'The font'], correctIndex: 1 },
    ],
  },
  {
    title: 'Fake bank alerts and account locks',
    category: 'bank',
    estimatedMinutes: 6,
    description: 'How attackers fake messages from Kenyan banks to rush you into clicking.',
    lessons: [
      {
        type: 'read',
        title: 'Why banks are impersonated',
        body: [
          'A message that your account is locked or under review creates fear, and fear makes people click before thinking.',
          'Banks do not restore access or confirm transactions through a link in an SMS or email. They ask you to use the official app, USSD, or a branch.',
        ],
        tips: [
          'Reach your bank only through the number on the back of your card or the official app.',
          'A genuine alert never needs your PIN, OTP, or full card number.',
        ],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap the parts of this email that should make you suspicious.',
        message: {
          channel: 'email',
          from: 'security@equity-online-ke.com',
          parts: [
            { text: 'Dear customer, ', flag: 'Generic greeting. Your bank knows your name.' },
            { text: 'your account was locked after a login from a new device. ' },
            { text: 'Restore access within 1 hour', flag: 'Artificial deadline to rush you.' },
            { text: ' at ' },
            { text: 'equity-online-ke.com', flag: 'Look-alike domain, not the real bank site.' },
          ],
        },
        senderFlag: 'The sender domain imitates the bank but is not official.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'An SMS says your account is locked and links you to restore access.',
        options: [
          { label: 'Click the link and log in to unlock it', correct: false, feedback: 'The link leads to a fake login that steals your credentials.' },
          { label: 'Open the official banking app or call the number on your card', correct: true, feedback: 'Right. Verify through a channel you trust, not the message.' },
          { label: 'Reply with your account number to speed it up', correct: false, feedback: 'Never share account details in reply to an unsolicited message.' },
        ],
      },
    ],
    quiz: [
      { question: 'How should you reach your bank after a scary alert?', options: ['Click the link in the message', 'Use the official app or the number on your card', 'Reply to the SMS'], correctIndex: 1 },
      { question: 'Which detail proves a bank message is fake?', options: ['It greets you by name', 'It asks for your PIN or OTP', 'It shows the bank logo'], correctIndex: 1 },
      { question: 'A caller from "the fraud team" asks for the OTP just sent to you. You:', options: ['Hang up and call the bank yourself', 'Read it out to stop the fraud', 'Text it to them'], correctIndex: 0 },
      { question: 'An SMS says your card is blocked and gives a number to call. You:', options: ['Call that number', 'Call the number on the back of your card', 'Reply with your card number'], correctIndex: 1 },
      { question: 'A bank email link goes to secure-equitybank-login.com. It is:', options: ['The bank\'s secure site', 'A lookalike site', 'Safe because it says secure'], correctIndex: 1 },
      { question: 'You shared your banking PIN by mistake. What first?', options: ['Wait for a debit', 'Call the bank to block the card and change the PIN', 'Delete the message'], correctIndex: 1 },
    ],
  },
  {
    title: 'IT and help-desk scams',
    category: 'it-support',
    estimatedMinutes: 6,
    description: 'Password-expiry, storage-full and MFA re-enrolment lures that target staff logins.',
    lessons: [
      {
        type: 'read',
        title: 'Why your login is the target',
        body: [
          'Your work account is a key to email, files and systems, so attackers pose as IT to capture your password or MFA code.',
          'Real IT messages do not threaten instant lockout and then send you to an outside website to keep your password.',
        ],
        tips: [
          'Check with the service desk through its known channel before acting.',
          'Look at the link destination: a real tenant login is on your own company domain.',
        ],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap what looks wrong in this help-desk email.',
        message: {
          channel: 'email',
          from: 'it-helpdesk@m365-support.net',
          parts: [
            { text: 'Your password EXPIRE today', flag: 'Grammar error and manufactured urgency.' },
            { text: '. Click to ' },
            { text: 'keep your current password', flag: 'Real IT never asks you to keep a password via a link.' },
            { text: ' at ' },
            { text: 'm365-support.net', flag: 'Not your company domain.' },
          ],
        },
        senderFlag: 'An outside support domain, not your internal IT.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'An email says staff in your role must re-enrol MFA today or be locked out.',
        options: [
          { label: 'Follow the link and enter your login and MFA code', correct: false, feedback: 'This hands your credentials and code to the attacker in real time.' },
          { label: 'Open the MFA settings yourself from the official portal, or ask IT', correct: true, feedback: 'Correct. Navigate there yourself instead of trusting the link.' },
          { label: 'Forward it to colleagues so they are not locked out', correct: false, feedback: 'Spreading it only widens the trap. Report it to IT instead.' },
        ],
      },
    ],
    quiz: [
      { question: 'A password-expiry email links to an outside site. You:', options: ['Enter your password to keep it', 'Go to the official portal yourself or ask IT', 'Ignore all IT emails forever'], correctIndex: 1 },
      { question: 'What is a strong sign an IT email is fake?', options: ['It is on your company domain', 'It threatens instant lockout and links offsite', 'It has no attachment'], correctIndex: 1 },
      { question: 'Someone from "IT" calls and asks for your password to fix your mailbox. You:', options: ['Give it, they are IT', 'Refuse, IT never needs your password', 'Email it to them instead'], correctIndex: 1 },
      { question: 'A pop-up says your PC is infected and to call a number. You:', options: ['Call the number', 'Close it and tell IT', 'Install the tool it offers'], correctIndex: 1 },
      { question: 'An "IT" email asks you to approve an MFA prompt you did not start. You:', options: ['Deny it and report to IT', 'Approve to stop the prompts', 'Approve once only'], correctIndex: 0 },
      { question: 'Where do you check if an IT notice is real?', options: ['Reply to the sender', 'The official IT help desk or intranet', 'The link in the notice'], correctIndex: 1 },
    ],
  },
  {
    title: 'HR and payroll scams',
    category: 'hr-payroll',
    estimatedMinutes: 5,
    description: 'Salary-structure and bank-detail lures that aim to redirect your pay.',
    lessons: [
      {
        type: 'read',
        title: 'Why payroll is targeted',
        body: [
          'A message about your salary gets attention, and confirm your bank details can quietly redirect your pay to the attacker.',
          'Changes to pay details are handled through the official HR system or in person, never by a link in an unexpected email.',
        ],
        tips: [
          'Confirm any pay-detail request face to face or through the HR system you already use.',
          'Be wary of deadlines tied to the monthly payroll run.',
        ],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap the suspicious parts of this HR email.',
        message: {
          channel: 'email',
          from: 'payroll@hr-portal-ke.com',
          parts: [
            { text: 'Confirm your bank details before Thursday', flag: 'Deadline pressure tied to payroll.' },
            { text: ' or your salary may be delayed. ' },
            { text: 'Update here', flag: 'Pay details should change in the official HR system, not via a link.' },
            { text: ': hr-portal-ke.com', flag: 'External look-alike domain.' },
          ],
        },
        senderFlag: 'An outside HR portal domain, not your employer.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'An email asks you to confirm your payroll bank details to avoid a delayed salary.',
        options: [
          { label: 'Update your details through the link', correct: false, feedback: 'This can redirect your salary to an attacker account.' },
          { label: 'Confirm with HR in person or through the official system', correct: true, feedback: 'Right. Verify pay changes through a trusted channel.' },
          { label: 'Reply with your account number', correct: false, feedback: 'Never send bank details in reply to an unsolicited request.' },
        ],
      },
    ],
    quiz: [
      { question: 'How are payroll bank-detail changes handled safely?', options: ['Via a link in an email', 'Through the official HR system or in person', 'By replying with your details'], correctIndex: 1 },
      { question: 'What makes a payroll email suspicious?', options: ['It mentions payroll', 'It pressures you with a deadline and links offsite', 'It is signed by HR'], correctIndex: 1 },
      { question: 'An email offers a "salary increment letter" behind a login link. You:', options: ['Log in to read it', 'Check with HR directly', 'Forward it to colleagues'], correctIndex: 1 },
      { question: 'HR emails asking for your ID and KRA PIN in a reply. You:', options: ['Reply with them', 'Confirm with HR in person or on a known line', 'Send just the ID'], correctIndex: 1 },
      { question: 'A payslip attachment asks you to "enable macros" to view it. It is:', options: ['Likely malware', 'Normal for payslips', 'Safe if from HR'], correctIndex: 0 },
      { question: 'Who should you tell about a suspicious HR email?', options: ['Nobody', 'IT or security, using the report button', 'Only the sender'], correctIndex: 1 },
    ],
  },
  {
    title: 'Parcel and delivery scams',
    category: 'delivery',
    estimatedMinutes: 5,
    description: 'Fake parcel-waiting and confirm-your-address messages that ask for a fee or details.',
    lessons: [
      {
        type: 'read',
        title: 'Why delivery lures work',
        body: [
          'Many people are expecting something, so a parcel-waiting message feels normal and easy to act on.',
          'Couriers do not ask for a small fee or your personal details through a random SMS link.',
        ],
        tips: [
          'Track parcels only on the official courier site using your own order reference.',
          'A tiny release fee is a classic trick to capture card details.',
        ],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap what should make you suspicious.',
        message: {
          channel: 'sms',
          from: '+254 7XX XXX 884',
          parts: [
            { text: 'you have 1 parcel waiting. ', flag: 'Vague. No courier name or tracking reference.' },
            { text: 'pay small fee of Ksh 150', flag: 'Couriers do not take release fees by SMS link.' },
            { text: ' to release it: ' },
            { text: 'parcel-ke.link', flag: 'Shortened, unofficial web address.' },
          ],
        },
        senderFlag: 'Sent from an ordinary mobile number, not a courier.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'An SMS says a parcel needs a Ksh 150 fee to be released.',
        options: [
          { label: 'Pay the fee so it is not returned', correct: false, feedback: 'The fee page is built to steal your card details.' },
          { label: 'Check the official courier site with your own order reference', correct: true, feedback: 'Right. Verify independently; ignore the link.' },
          { label: 'Reply with your card number', correct: false, feedback: 'Never share card details in response to an SMS.' },
        ],
      },
    ],
    quiz: [
      { question: 'A parcel SMS asks for a small release fee. You:', options: ['Pay it immediately', 'Verify on the official courier site', 'Send your card number'], correctIndex: 1 },
      { question: 'What is a tell-tale sign of a parcel scam?', options: ['It names the courier and your order', 'It is vague and asks for a fee via a link', 'It arrives on a weekday'], correctIndex: 1 },
      { question: 'You get a delivery SMS but ordered nothing. You:', options: ['Ignore the link and delete it', 'Click to see what it is', 'Pay to find out'], correctIndex: 0 },
      { question: 'How do you check a real parcel?', options: ['With the tracking number on the courier\'s own site', 'Through the SMS link', 'By replying to the SMS'], correctIndex: 0 },
      { question: 'A courier site asks for your full card details for KES 150. It is:', options: ['A normal fee', 'A card-harvesting trick', 'A customs charge'], correctIndex: 1 },
      { question: 'A delivery link ends in .apk and asks you to install it. You:', options: ['Install it to track', 'Do not install, it could be malware', 'Install then delete'], correctIndex: 1 },
    ],
  },
  {
    title: 'CEO and urgent-task scams',
    category: 'ceo-fraud',
    estimatedMinutes: 5,
    description: 'Business email compromise: a senior name pressuring you into a quick, secret task.',
    lessons: [
      {
        type: 'read',
        title: 'Why impersonating the boss works',
        body: [
          'A request from a senior name, marked urgent and secret, pushes you to act without the usual checks.',
          'Genuine leaders expect you to verify unusual money or data requests, especially when told not to call.',
        ],
        tips: [
          'Any urgent and confidential money or gift-card request is a red flag.',
          'Verify through a known phone number or in person, never by replying to the message.',
        ],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap the manipulative parts of this message.',
        message: {
          channel: 'email',
          from: 'md.office@secure-mail-ke.com',
          parts: [
            { text: 'Are you at your desk? I need something handled now. ', flag: 'Urgency to bypass normal process.' },
            { text: 'Do not call me', flag: 'Discourages the out-of-band check that would expose it.' },
            { text: ', just use the secure note: ' },
            { text: 'secure-mail-ke.com', flag: 'Look-alike domain, not the real executive address.' },
          ],
        },
        senderFlag: 'The address imitates the MD but is an outside domain.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'The MD emails you urgently to buy gift cards and send the codes, and says not to call.',
        options: [
          { label: 'Buy them quickly because it is the MD', correct: false, feedback: 'Urgency plus a senior name is the core of this scam.' },
          { label: 'Call the MD on their known number to confirm', correct: true, feedback: 'Correct. Verify out of band before acting.' },
          { label: 'Reply to the email to confirm the amount', correct: false, feedback: 'The reply goes straight to the attacker.' },
        ],
      },
    ],
    quiz: [
      { question: 'An urgent do-not-call request from the boss should make you:', options: ['Act fast to impress them', 'Verify on a known number first', 'Reply to confirm'], correctIndex: 1 },
      { question: 'A hallmark of CEO fraud is:', options: ['A detailed, routine request', 'Secrecy, urgency and a senior name', 'A request sent to the whole team'], correctIndex: 1 },
      { question: 'The "MD" emails from a Gmail address asking for gift cards. You:', options: ['Buy them quickly', 'Verify with the MD on a known number', 'Reply asking which cards'], correctIndex: 1 },
      { question: 'A director asks you to skip the approval process "just this once". You:', options: ['Follow the normal approval process', 'Skip it, they are senior', 'Ask a colleague to pay instead'], correctIndex: 0 },
      { question: 'The display name says "CEO" but the address is ceo.office@outlook.com. It is:', options: ['The CEO\'s backup email', 'A likely impersonation', 'Fine for urgent matters'], correctIndex: 1 },
      { question: 'Why do CEO fraud emails say "I\'m in a meeting, can\'t talk"?', options: ['To stop you verifying by phone', 'Because CEOs are busy', 'To be polite'], correctIndex: 0 },
    ],
  },
  {
    title: 'SACCO dividend and loan scams',
    category: 'sacco',
    estimatedMinutes: 5,
    description: 'Fake dividend and loan-approval messages that ask you to update payout details.',
    lessons: [
      {
        type: 'read',
        title: 'Why SACCO members are targeted',
        body: [
          'Dividends and loan approvals are welcome news, so a message about them lowers your guard.',
          'Your SACCO already holds your payout details, so a message asking you to update them through a link is a warning sign.',
        ],
        tips: [
          'Confirm dividends or loans through the official SACCO office or app.',
          'Good news used to rush you is still a pressure tactic.',
        ],
      },
      {
        type: 'spot',
        title: 'Find the red flags',
        intro: 'Tap the suspicious parts of this SMS.',
        message: {
          channel: 'sms',
          from: '+254 7XX XXX 512',
          parts: [
            { text: 'Your SACCO dividend is ready. ', flag: 'No SACCO name or member number.' },
            { text: 'Update your payout details', flag: 'Your SACCO already has these, so no link update is needed.' },
            { text: ' to receive it: ' },
            { text: 'sacco-pay.ke.link', flag: 'Unofficial shortened web address.' },
          ],
        },
        senderFlag: 'Sent from an ordinary mobile number, not your SACCO.',
      },
      {
        type: 'choice',
        title: 'What would you do?',
        scenario: 'An SMS says your SACCO dividend is ready once you update your payout details.',
        options: [
          { label: 'Update the details through the link', correct: false, feedback: 'The page harvests your details or redirects your money.' },
          { label: 'Confirm with the SACCO office or official app', correct: true, feedback: 'Right. Verify through the channel you already use.' },
          { label: 'Share your member number and ID in reply', correct: false, feedback: 'Never share identity details in response to an unsolicited SMS.' },
        ],
      },
    ],
    quiz: [
      { question: 'A dividend SMS asks you to update payout details. You:', options: ['Update via the link', 'Confirm with the SACCO office or app', 'Reply with your ID number'], correctIndex: 1 },
      { question: 'Why do dividend and loan scams work?', options: ['They use good news to lower your guard', 'They are always poorly written', 'They never mention money'], correctIndex: 0 },
      { question: 'A "SACCO officer" asks for a processing fee to release your loan. You:', options: ['Pay to speed it up', 'Check with the SACCO office first', 'Send half now'], correctIndex: 1 },
      { question: 'Your SACCO login link arrives by WhatsApp from an unknown number. You:', options: ['Use the official app or website instead', 'Log in through it', 'Forward it to members'], correctIndex: 0 },
      { question: 'An SMS asks you to send your member number and ID to claim a bonus. It is:', options: ['A routine update', 'A likely identity scam', 'Required by law'], correctIndex: 1 },
      { question: 'Who should you tell about a fake SACCO message?', options: ['The SACCO through its official contacts', 'Nobody', 'The sender'], correctIndex: 0 },
    ],
  },
];
