import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, FormField, Input, PasswordInput, Stepper } from '../../components/ui';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ['Organisation details', 'Admin account'];

const initialForm = {
  organizationName: '',
  organizationIndustry: '',
  organizationCounty: '',
  adminFullName: '',
  adminEmail: '',
  adminPassword: '',
  confirmPassword: '',
};

function validateStep(step, form) {
  const errors = {};
  if (step === 0 && !form.organizationName.trim())
    errors.organizationName = 'Organisation name is required';
  if (step === 1) {
    if (!form.adminFullName.trim()) errors.adminFullName = 'Your full name is required';
    if (!EMAIL_RE.test(form.adminEmail)) errors.adminEmail = 'Enter a valid email address';
    if (form.adminPassword.length < 8) errors.adminPassword = 'Use at least 8 characters';
    if (form.confirmPassword !== form.adminPassword)
      errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

function RegisterPage() {
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm((prev) => ({ ...prev, [name]: e.target.value })),
  });

  function next(e) {
    e.preventDefault();
    const found = validateStep(step, form);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep(1);
  }

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const found = validateStep(1, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    try {
      // eslint-disable-next-line no-unused-vars -- confirmPassword is client-side only
      const { confirmPassword, ...payload } = form;
      await registerOrganization(payload);
      setDone(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Registration failed');
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
          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">You’re all set</h1>
          <p className="mt-2 text-body text-ink-2">
            <strong className="text-ink">{form.organizationName}</strong> is ready. Next, add your
            employees. You set each person’s login details, and they use those to sign in.
          </p>
          <Button
            variant="primary"
            size="lg"
            iconRight={ArrowRight}
            className="mt-6 w-full"
            onClick={() => navigate('/admin')}
          >
            Go to dashboard
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Create your organisation</h1>
      <p className="mt-1 text-body text-ink-2">For organisation admins. It takes about a minute.</p>
      <Stepper steps={STEPS} current={step} className="mt-6" />

      {step === 0 ? (
        <form onSubmit={next} noValidate className="mt-6 grid gap-4">
          <FormField label="Organisation name" required error={errors.organizationName}>
            <Input autoComplete="organization" {...field('organizationName')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Industry">
              <Input placeholder="e.g. Banking" {...field('organizationIndustry')} />
            </FormField>
            <FormField label="County">
              <Input placeholder="e.g. Nairobi" {...field('organizationCounty')} />
            </FormField>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            iconRight={ArrowRight}
            className="mt-2 w-full"
          >
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
          <FormField label="Full name" required error={errors.adminFullName}>
            <Input autoComplete="name" {...field('adminFullName')} />
          </FormField>
          <FormField label="Work email" required error={errors.adminEmail}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@company.co.ke"
              {...field('adminEmail')}
            />
          </FormField>
          <FormField
            label="Password"
            required
            hint="At least 8 characters"
            error={errors.adminPassword}
          >
            <PasswordInput autoComplete="new-password" {...field('adminPassword')} />
          </FormField>
          <FormField label="Confirm password" required error={errors.confirmPassword}>
            <PasswordInput autoComplete="new-password" {...field('confirmPassword')} />
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
          <div className="mt-2 flex gap-2">
            <Button icon={ArrowLeft} size="lg" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="flex-1"
            >
              Create organisation
            </Button>
          </div>
        </form>
      )}

      <p className="mt-5 flex gap-2 rounded-control bg-brand-50 px-3 py-2.5 text-xs text-ink-2">
        <Info size={15} className="mt-px shrink-0 text-brand-700" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">Employee?</strong> You don’t need to sign up.
          Your admin adds you and gives you your login details.
        </span>
      </p>

      <p className="mt-6 text-center text-body text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default RegisterPage;
