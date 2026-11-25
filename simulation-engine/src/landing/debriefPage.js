// The page a recipient lands on after clicking a simulated phishing link — for
// both the SMS tracker (served by the engine) and the Gophish email landing
// page. It must be fully self-contained (inline CSS, no scripts, no external
// assets) so it renders anywhere and offline, and it never collects input.
//
// Its job is to turn the click into a teaching moment: a clear "this was a
// test" header, a short sharp warning, and a plain list of the real-world harm
// a genuine attacker could have caused with that click.

const RISKS = [
  ['Stolen your password', 'A look-alike login page could have captured your username and password the moment you typed them.'],
  ['Emptied an account', 'An OTP or M-Pesa PIN entered here is enough for an attacker to move real money in seconds.'],
  ['Infected your device', 'A link like this can quietly download malware that spies on you or locks your files for ransom.'],
  ['Taken over your inbox', 'With your login, an attacker can read your email and send convincing scams to your colleagues and contacts.'],
  ['Exposed company data', 'One compromised account can open the door to customer records and confidential business information.'],
];

const SIGNS = [
  'Urgency or threats — "verify now or your account is suspended".',
  'A sender address or link domain that is not the real organisation\'s.',
  'A request for a password, PIN, OTP or M-Pesa confirmation.',
  'An unexpected message, even if the name looks familiar.',
];

function debriefHtml({ channel = 'email' } = {}) {
  const thing = channel === 'sms' ? 'message' : 'email';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Security awareness simulation</title>
  <style>
    /* RedFlag brand crimson (matches the portal) on a distinct standalone-alert
       layout — related to the platform, deliberately not a copy of it. */
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(1200px 500px at 50% -10%, #4a0d0d, #1f0a0a 70%);
      color: #1a1414;
      line-height: 1.55;
      padding: 32px 16px;
    }
    .card {
      max-width: 640px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 30px 60px -20px rgba(31, 10, 10, 0.6);
    }
    .banner {
      background: linear-gradient(135deg, #650f0f, #9b1c1c);
      color: #fff;
      padding: 26px 30px 26px;
    }
    .brand { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; }
    .brand .wordmark { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
    .badge {
      display: inline-block;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: .09em;
      text-transform: uppercase;
      background: rgba(255,255,255,.16);
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    .banner h1 { margin: 0; font-size: 25px; line-height: 1.22; letter-spacing: -0.015em; }
    .banner p { margin: 10px 0 0; color: #f7e1e1; font-size: 15px; }
    .body { padding: 26px 30px 30px; }
    .warn {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 14px 16px;
      margin: 0 0 24px;
      font-size: 15px;
      color: #78350f;
    }
    .warn strong { color: #92400e; }
    h2 { font-size: 13.5px; letter-spacing: .05em; text-transform: uppercase; color: #8a6d6d; margin: 22px 0 12px; }
    ul.risks { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    ul.risks li {
      border: 1px solid #f0e3e3;
      border-left: 4px solid #9b1c1c;
      border-radius: 10px;
      padding: 12px 14px;
      background: #fdf8f8;
    }
    ul.risks .t { font-weight: 700; color: #1a1414; display: block; margin-bottom: 2px; }
    ul.risks .d { color: #6b5555; font-size: 14px; }
    ul.signs { margin: 0; padding-left: 20px; color: #4a3b3b; font-size: 14px; }
    ul.signs li { margin: 6px 0; }
    .next {
      margin-top: 24px;
      background: #fcf3f3;
      border: 1px solid #f7e1e1;
      border-radius: 12px;
      padding: 16px 18px;
      font-size: 14px;
      color: #4a3b3b;
    }
    .next strong { color: #7f1414; }
    .foot { margin-top: 22px; font-size: 12px; color: #a89595; text-align: center; }
  </style>
</head>
<body>
  <main class="card">
    <header class="banner">
      <span class="brand">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#ffffff" />
          <path d="M11 25V7" stroke="#7f1414" stroke-width="2.5" stroke-linecap="round" />
          <path d="M11 8h11l-2.5 4.5L22 17H11z" fill="#7f1414" />
          <path d="M11 8h5v9h-5z" fill="#b42525" />
        </svg>
        <span class="wordmark">RedFlag</span>
      </span>
      <span class="badge">Security awareness test</span>
      <h1>You clicked a simulated phishing link</h1>
      <p>This ${thing} was sent by your organisation through RedFlag as a training exercise.
         It was <strong>not real</strong>, nothing was installed, and no information was collected.</p>
    </header>
    <section class="body">
      <p class="warn">
        <span aria-hidden="true">⚠️</span>
        <span><strong>One click can be all it takes.</strong> Had this been a real attack,
        simply following the link could have been enough to put you and your organisation at risk.
        Stop and verify before you click, every time.</span>
      </p>

      <h2>What a real attacker could have done</h2>
      <ul class="risks">
        ${RISKS.map(([t, d]) => `<li><span class="t">${t}</span><span class="d">${d}</span></li>`).join('\n        ')}
      </ul>

      <h2>Tell-tale signs to watch for next time</h2>
      <ul class="signs">
        ${SIGNS.map((s) => `<li>${s}</li>`).join('\n        ')}
      </ul>

      <p class="next">
        <strong>What to do now:</strong> report suspicious messages using the Report button in your
        RedFlag portal, and complete the short follow-up training module waiting for you there.
      </p>

      <p class="foot">RedFlag · Security awareness simulation · This is a safe training page.</p>
    </section>
  </main>
</body>
</html>`;
}

module.exports = { debriefHtml };
