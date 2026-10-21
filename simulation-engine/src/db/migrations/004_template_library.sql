-- Expands the default (organization_id IS NULL) template library across more
-- Kenyan lure categories and all three difficulty levels, for both channels.
--
-- Difficulty convention:
--   easy   - obvious red flags (generic greeting, bad grammar, odd URL/number).
--   medium - plausible branding and urgency, one or two subtle tells.
--   hard   - personalised, correct tone/branding, convincing pretext (email
--            templates use Gophish merge tags {{.FirstName}} / {{.Position}}).
-- SMS bodies use {{link}} (engine-substituted). Email bodies use {{.URL}}.
--
-- Idempotent: each row is inserted only if its key is not already a global
-- template, so re-running the migration (or adding to it later) is safe.

INSERT INTO campaign_templates (organization_id, type, key, name, subject, body, category, difficulty_level, is_default)
SELECT * FROM (VALUES
  -- ── M-Pesa (SMS) ──────────────────────────────────────────────────────────
  (NULL::integer, 'sms', 'mpesa-sms-easy', 'M-Pesa Prize (easy)', NULL,
   'CONGRATULATIONS!!! Your number has WON Ksh 50,000 from MPESA promo. To claim click here now: {{link}}',
   'mpesa', 'easy', true),
  (NULL, 'sms', 'mpesa-sms-hard', 'M-Pesa Reversal (hard)', NULL,
   'MPESA: A payment of Ksh4,500 to your line was flagged for reversal. Confirm it was yours to keep the funds: {{link}} Ref QG7{{link}}',
   'mpesa', 'hard', true),

  -- ── Banking (Equity / KCB / Co-op) ────────────────────────────────────────
  (NULL, 'sms', 'bank-sms-medium', 'Bank Account Locked (medium)', NULL,
   'Dear customer, your Equity account was temporarily locked after a login from a new device. Restore access: {{link}}',
   'bank', 'medium', true),
  (NULL, 'email', 'bank-email-hard', 'Bank Statement Review (hard)',
   'Your account statement needs review',
   '<p>Dear {{.FirstName}},</p><p>During a routine security review we noticed two transactions on your account that need your confirmation before they are cleared. For your protection, access to online banking is limited until this is resolved.</p><p>Please review and confirm the transactions here:</p><p><a href="{{.URL}}">Review my transactions</a></p><p>Thank you for banking with us.</p><p>Customer Operations</p>',
   'bank', 'hard', true),

  -- ── Safaricom (SMS) ───────────────────────────────────────────────────────
  (NULL, 'sms', 'safaricom-sms-medium', 'Bonga Points Expiry (medium)', NULL,
   'Safaricom: Your 12,400 Bonga Points expire today. Redeem before midnight to avoid losing them: {{link}}',
   'safaricom', 'medium', true),

  -- ── KRA (email) ───────────────────────────────────────────────────────────
  (NULL, 'email', 'kra-email-medium', 'iTax PIN Update (medium)',
   'iTax: confirm your PIN details',
   '<p>Dear Taxpayer,</p><p>As part of the ongoing iTax system update, all taxpayers are required to confirm their PIN details to keep their accounts active. Accounts not confirmed may face delays in clearance certificates.</p><p><a href="{{.URL}}">Confirm my PIN details</a></p><p>Kenya Revenue Authority</p>',
   'kra', 'medium', true),

  -- ── Invoice / supplier (email) ────────────────────────────────────────────
  (NULL, 'email', 'invoice-email-medium', 'Supplier Invoice (medium)',
   'Invoice #INV-2291 for your approval',
   '<p>Hello,</p><p>Please find the invoice for last month''s supply ready for approval. Kindly review it so we can schedule payment in this week''s run.</p><p><a href="{{.URL}}">View invoice INV-2291</a></p><p>Regards,<br/>Accounts Receivable</p>',
   'invoice', 'medium', true),

  -- ── IT / help desk (email) ────────────────────────────────────────────────
  (NULL, 'email', 'itsupport-email-easy', 'Password Expiry (easy)',
   'Your password expire today!!',
   '<p>Dear User,</p><p>Your email password is EXPIRE today. If you do not update now you will loose access to you account. Click to keep you password:</p><p><a href="{{.URL}}">Keep my password</a></p><p>IT Team</p>',
   'it-support', 'easy', true),
  (NULL, 'email', 'itsupport-email-medium', 'Mailbox Storage Full (medium)',
   'Action needed: your mailbox is almost full',
   '<p>Hello,</p><p>Your mailbox has reached 98% of its storage limit. Once full you will stop receiving new messages. Request additional storage using the self-service portal below.</p><p><a href="{{.URL}}">Request more storage</a></p><p>Service Desk</p>',
   'it-support', 'medium', true),
  (NULL, 'email', 'itsupport-email-hard', 'MFA Re-enrolment (hard)',
   'Re-enrol your multi-factor authentication',
   '<p>Hi {{.FirstName}},</p><p>Following this week''s migration, staff in {{.Position}} roles need to re-enrol their multi-factor authentication by end of day to avoid a lockout on Monday. This takes about a minute.</p><p><a href="{{.URL}}">Re-enrol my MFA</a></p><p>If you have already done this, you can ignore this message.</p><p>IT Service Desk</p>',
   'it-support', 'hard', true),

  -- ── HR / payroll (email) ──────────────────────────────────────────────────
  (NULL, 'email', 'hr-email-medium', 'Updated Salary Structure (medium)',
   'Updated salary structure - review required',
   '<p>Dear Colleague,</p><p>HR has published the updated salary structure effective next month. Please review your revised grade and confirm receipt using the link below.</p><p><a href="{{.URL}}">Review my salary structure</a></p><p>Human Resources</p>',
   'hr-payroll', 'medium', true),
  (NULL, 'email', 'hr-email-hard', 'Payroll Bank Details (hard)',
   'Confirm your bank details before this month''s payroll',
   '<p>Hi {{.FirstName}},</p><p>We are finalising this month''s payroll run. Our records show your bank details may be out of date. To make sure your salary is not delayed, please confirm or update them before Thursday.</p><p><a href="{{.URL}}">Confirm my bank details</a></p><p>Payroll Office</p>',
   'hr-payroll', 'hard', true),

  -- ── Parcel / delivery (SMS) ───────────────────────────────────────────────
  (NULL, 'sms', 'delivery-sms-easy', 'Parcel Fee (easy)', NULL,
   'you have 1 parcel waiting. pay small fee of Ksh 150 to release it now: {{link}}',
   'delivery', 'easy', true),
  (NULL, 'sms', 'delivery-sms-medium', 'Delivery Address (medium)', NULL,
   'G4S: We attempted delivery of your parcel but the address was incomplete. Confirm your details to reschedule: {{link}}',
   'delivery', 'medium', true),

  -- ── CEO / business email compromise (email) ───────────────────────────────
  (NULL, 'email', 'ceo-email-hard', 'Quick Task From The MD (hard)',
   'Are you at your desk?',
   '<p>{{.FirstName}}, are you available? I am going into a meeting and need you to handle something time-sensitive for me quickly. Reply or use the secure note below - do not call, I cannot take calls right now.</p><p><a href="{{.URL}}">Open secure note</a></p><p>Sent from my phone</p>',
   'ceo-fraud', 'hard', true),

  -- ── SACCO (SMS + email) ───────────────────────────────────────────────────
  (NULL, 'sms', 'sacco-sms-medium', 'SACCO Dividend (medium)', NULL,
   'Your SACCO dividend for 2025 is ready for disbursement. Update your payout details to receive it: {{link}}',
   'sacco', 'medium', true),
  (NULL, 'email', 'sacco-email-medium', 'SACCO Loan Approved (medium)',
   'Your loan application has been approved',
   '<p>Dear Member,</p><p>Good news - your loan application has been approved. To release the funds to your account, please confirm your membership details using the link below.</p><p><a href="{{.URL}}">Confirm and receive funds</a></p><p>SACCO Credit Office</p>',
   'sacco', 'medium', true)
) AS t(organization_id, type, key, name, subject, body, category, difficulty_level, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM campaign_templates c
  WHERE c.organization_id IS NULL AND c.key = t.key
);
