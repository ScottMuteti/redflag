-- Make the default phishing links follow the lure's theme: the visible link
-- text now reads as a believable, branded look-alike URL, while the real href
-- stays the tracking token ({{.URL}}). That mismatch is the tell we teach —
-- hovering reveals the link does not go where it claims. Only the built-in
-- defaults (organization_id IS NULL) are touched; org customisations are left.

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Review my transactions</a>',
  '<a href="{{.URL}}">https://online.equity-online-ke.com/secure/verify</a>')
WHERE key = 'bank-email-hard' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Confirm my PIN details</a>',
  '<a href="{{.URL}}">https://itax.kra-online.co.ke/confirm-pin</a>')
WHERE key = 'kra-email-medium' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">View invoice INV-2291</a>',
  '<a href="{{.URL}}">https://accounts.supplier-ke.com/invoices/INV-2291</a>')
WHERE key = 'invoice-email-medium' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Keep my password</a>',
  '<a href="{{.URL}}">http://mail-login-security-update.com/keep</a>')
WHERE key = 'itsupport-email-easy' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Request more storage</a>',
  '<a href="{{.URL}}">https://storage.m365-helpdesk.net/request</a>')
WHERE key = 'itsupport-email-medium' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Re-enrol my MFA</a>',
  '<a href="{{.URL}}">https://login.microsoftonline.m365-support.net/mfa</a>')
WHERE key = 'itsupport-email-hard' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Review my salary structure</a>',
  '<a href="{{.URL}}">https://hr.company-portal-ke.net/salary</a>')
WHERE key = 'hr-email-medium' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Confirm my bank details</a>',
  '<a href="{{.URL}}">https://payroll.hr-portal-ke.com/bank-details</a>')
WHERE key = 'hr-email-hard' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Open secure note</a>',
  '<a href="{{.URL}}">https://secure-mail-ke.com/note/view</a>')
WHERE key = 'ceo-email-hard' AND organization_id IS NULL;

UPDATE campaign_templates SET body = REPLACE(body,
  '<a href="{{.URL}}">Confirm and receive funds</a>',
  '<a href="{{.URL}}">https://members.sacco-ke.org/loan/confirm</a>')
WHERE key = 'sacco-email-medium' AND organization_id IS NULL;
