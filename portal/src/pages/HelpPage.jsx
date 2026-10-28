/* eslint-disable react/prop-types -- page */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, PageHeader, SearchInput } from '../components/ui';
import { cn } from '../lib/cn';

const FAQ = {
  admin: [
    [
      'How do I run my first simulation?',
      'Add employees, then go to Campaigns → New Campaign. Pick a channel and template, choose an audience and launch now or schedule it.',
    ],
    [
      'Why did my email campaign fail to launch?',
      'Email campaigns go through Gophish. Check that Gophish is running and that GOPHISH_API_KEY, the sending profile and the landing page are set up.',
    ],
    [
      'Why did my SMS campaign fail?',
      "SMS goes through Africa's Talking. Check AT_API_KEY and AT_USERNAME, and that employees have phone numbers. Sandbox messages only reach the simulator.",
    ],
    [
      'How is the risk score worked out?',
      'A logistic regression model uses each employee’s simulation history (opens, clicks, submissions, reports) and tenure to predict how likely they are to fall for an attack. Recompute it from Analytics or the employee panel.',
    ],
    [
      'How is training assigned?',
      'When someone clicks a simulation, they get the training module whose category matches the template. You can also assign modules by hand from Training.',
    ],
    [
      'What do employee reports mean?',
      'Employees flag suspicious messages from their portal. A report that matches a recent simulation counts as a good catch; one that doesn’t may be a real attack and should be checked.',
    ],
    [
      'How do employees log in?',
      'You set their first password when adding them. They log in at the normal login page and can change it in Settings.',
    ],
  ],
  employee: [
    [
      'Why did I get a simulated message?',
      'Your organisation runs safe practice attacks to help everyone spot real ones. Nothing harmful happened.',
    ],
    [
      'What should I do with a suspicious message?',
      'Don’t click links or reply. Use Reports Sent → Report a message. If it was a simulation, it counts in your favour.',
    ],
    [
      'How does training work?',
      'Work through the short interactive lessons, then pass the quiz with 80% or more. You can retake the quiz.',
    ],
    [
      'How can I lower my risk score?',
      'Report suspicious messages, avoid clicking unknown links, and finish assigned training. Scores are recalculated over time.',
    ],
    [
      'I forgot my password',
      'Use “Forgot password?” on the login page to get a reset link by email, or ask your administrator to set a new one.',
    ],
    [
      'Why can’t I log in with Google?',
      'Google only works for accounts your organisation has added. If you see “Account not approved”, ask your manager to add you.',
    ],
  ],
  system_admin: [
    [
      'How do access requests work?',
      'Organisations can’t sign themselves up. Their requests appear at the top of Organisations: Review to edit and approve (creates the org and emails its admin an invite), or Decline.',
    ],
    [
      'How do I onboard an organisation?',
      'Organisations → Onboard organisation. Its first admin gets an email link to set a password, then adds employees.',
    ],
    [
      'What does suspending do?',
      'Admins and employees of a suspended organisation are refused at login. Nothing is deleted; reactivate to restore access.',
    ],
    [
      'How do global templates relate to an organisation’s?',
      'Global templates are the default library. An organisation can edit its own copy; deleting a global template is blocked while upcoming campaigns use it.',
    ],
    [
      'How is a system admin created?',
      'Only from the server: npm run create:system-admin -- <email> "<Full Name>". It prints a one-time set-password link.',
    ],
  ],
};

function HelpPage({ role }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(0);
  const q = query.trim().toLowerCase();
  const items = FAQ[role].filter(
    ([question, answer]) => !q || `${question} ${answer}`.toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader title="Help Center" subtitle="Guides and answers" />
      <Card index={0} className="max-w-3xl">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search help…"
          className="mb-4"
        />
        {items.length === 0 && (
          <p className="text-body text-ink-3">No answers match that search.</p>
        )}
        <ul className="divide-y divide-line">
          {items.map(([question, answer], i) => (
            <li key={question}>
              <button
                type="button"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? -1 : i)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left font-semibold text-ink"
              >
                {question}
                <ChevronDown
                  size={16}
                  className={cn('shrink-0 transition', open === i && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
              {open === i && <p className="pb-4 text-body text-ink-2">{answer}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export default HelpPage;
