import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import { Button, FormField, Input } from '../../components/ui';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// There is no self-service reset endpoint yet: employee passwords are reset by their admin
// (PUT /employees/:id/password). TODO: wire to a reset-email endpoint when the API adds one.
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setSent(true);
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
          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">Ask your admin</h1>
          <p className="mt-2 text-body text-ink-2">
            Passwords for <strong className="text-ink">{email}</strong> are managed by your
            organisation admin. They can set a new one for you from the Employees page in seconds.
          </p>
          <p className="mt-3 text-body text-ink-2">
            If you’re the admin and you’re locked out, contact RedFlag support.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-[26px] font-bold tracking-tight text-ink">
            Forgot your password?
          </h1>
          <p className="mt-1 text-body text-ink-2">
            Enter your email and we’ll tell you how to get back in.
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
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Continue
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
