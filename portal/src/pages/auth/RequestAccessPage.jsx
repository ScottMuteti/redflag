import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Info } from 'lucide-react';
import { requestAccess } from '../../api/auth';
import { Button, FormField, Input, Textarea } from '../../components/ui';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialForm = {
  organizationName: '',
  industry: '',
  county: '',
  employeeCount: '',
  contactName: '',
  contactEmail: '',
  phoneNumber: '',
  message: '',
};

function validate(form) {
  const errors = {};
  if (!form.organizationName.trim()) errors.organizationName = 'Organisation name is required';
  if (!form.contactName.trim()) errors.contactName = 'Your full name is required';
  if (!EMAIL_RE.test(form.contactEmail)) errors.contactEmail = 'Enter a valid email address';
  if (form.employeeCount && !(Number.isInteger(Number(form.employeeCount)) && Number(form.employeeCount) > 0)) {
    errors.employeeCount = 'Enter a whole number';
  }
  return errors;
}

// Self sign-up is closed: organisations ask for access and the RedFlag team
// onboards them, emailing the contact a link to set their admin password.
function RequestAccessPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm((prev) => ({ ...prev, [name]: e.target.value })),
  });

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    try {
      await requestAccess({
        ...form,
        employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
      });
      setDone(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not send your request');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-bg text-success">
            <CheckCircle2 size={28} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">Request sent</h1>
          <p className="mt-2 text-body text-ink-2">
            Thanks. We’ll review access for{' '}
            <strong className="text-ink">{form.organizationName}</strong> and email{' '}
            <strong className="text-ink">{form.contactEmail}</strong>. Once approved, you’ll get a
            link to set your admin password.
          </p>
          <Button as={Link} to="/" variant="primary" size="lg" className="mt-6 w-full">
            Back to home
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Building2 size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">Request access</h1>
      <p className="mt-1 text-body text-ink-2">
        Tell us about your organisation. We set up every account so only approved organisations
        run simulations.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
        <FormField label="Organisation name" required error={errors.organizationName}>
          <Input autoComplete="organization" {...field('organizationName')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Industry">
            <Input placeholder="e.g. Banking" {...field('industry')} />
          </FormField>
          <FormField label="County">
            <Input placeholder="e.g. Nairobi" {...field('county')} />
          </FormField>
          <FormField label="Employees" error={errors.employeeCount}>
            <Input inputMode="numeric" placeholder="e.g. 50" {...field('employeeCount')} />
          </FormField>
        </div>
        <FormField label="Your full name" required error={errors.contactName}>
          <Input autoComplete="name" {...field('contactName')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Work email" required error={errors.contactEmail}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@company.co.ke"
              {...field('contactEmail')}
            />
          </FormField>
          <FormField label="Phone">
            <Input type="tel" autoComplete="tel" placeholder="+2547…" {...field('phoneNumber')} />
          </FormField>
        </div>
        <FormField label="Anything we should know?">
          <Textarea rows={3} {...field('message')} />
        </FormField>
        {formError && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-control bg-danger-bg px-3 py-2.5 text-body text-danger"
          >
            <AlertCircle size={16} aria-hidden="true" />
            {formError}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
          Send request
        </Button>
      </form>

      <p className="mt-5 flex gap-2 rounded-control bg-brand-50 px-3 py-2.5 text-xs text-ink-2">
        <Info size={15} className="mt-px shrink-0 text-brand-700" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">Employee?</strong> You don’t need to request
          access. Your manager adds you to RedFlag.
        </span>
      </p>

      <Button as={Link} to="/login" variant="ghost" icon={ArrowLeft} className="mt-6">
        Back to log in
      </Button>
    </AuthLayout>
  );
}

export default RequestAccessPage;
