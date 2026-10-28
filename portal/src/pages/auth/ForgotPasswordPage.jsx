import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '../../api/auth';
import { Button, FormField, Input } from '../../components/ui';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Emails a reset link. The answer is the same whether or not the account exists.
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setFormError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not send a reset link');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
        {sent ? (
          <MailCheck size={22} aria-hidden="true" />
        ) : (
          <KeyRound size={22} aria-hidden="true" />
        )}
      </span>
      {sent ? (
        <>
          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">Check your email</h1>
          <p className="mt-2 text-body text-ink-2">
            If <strong className="text-ink">{email}</strong> has a RedFlag account, we’ve sent a
            link to reset the password. It expires in 30 minutes.
          </p>
          <p className="mt-3 text-body text-ink-2">
            No email? Check spam, or ask your organisation admin to reset it for you.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">
            Forgot your password?
          </h1>
          <p className="mt-1 text-body text-ink-2">
            Enter your email and we’ll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
            <FormField label="Email" error={error}>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
              Send reset link
            </Button>
          </form>
        </>
      )}
      <Button as={Link} to="/login" variant="ghost" icon={ArrowLeft} className="mt-6">
        Back to log in
      </Button>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
