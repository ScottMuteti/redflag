import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { resetPassword } from '../../api/auth';
import { Button, FormField, PasswordInput } from '../../components/ui';
import AuthLayout from './AuthLayout';

// Landing page for emailed reset and invite links (?token=…).
function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 8) return setError('Use at least 8 characters');
    if (form.password !== form.confirm) return setError('Passwords don’t match');
    setError('');
    setFormError('');
    setSubmitting(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not set the password');
    } finally {
      setSubmitting(false);
    }
    return undefined;
  }

  if (done) {
    return (
      <AuthLayout>
        <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
          <CheckCircle2 size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">Password set</h1>
        <p className="mt-2 text-body text-ink-2">
          You can now log in with your new password. We’ll email you a code to finish signing in.
        </p>
        <Button as={Link} to="/login" variant="primary" size="lg" className="mt-6 w-full">
          Log in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
        <KeyRound size={22} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">Set a new password</h1>
      {token ? (
        <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
          <FormField label="New password" hint="At least 8 characters">
            <PasswordInput autoComplete="new-password" value={form.password} onChange={set('password')} />
          </FormField>
          <FormField label="Confirm new password" error={error}>
            <PasswordInput autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
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
            Set password
          </Button>
        </form>
      ) : (
        <p className="mt-2 text-body text-ink-2">
          This link is incomplete.{' '}
          <Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">
            Request a new one
          </Link>
          .
        </p>
      )}
      <Button as={Link} to="/login" variant="ghost" icon={ArrowLeft} className="mt-6">
        Back to log in
      </Button>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
