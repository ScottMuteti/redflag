import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, FormField, Input, PasswordInput } from '../../components/ui';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/portal');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-body text-ink-2">Log in to your RedFlag account.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-7 grid gap-4">
        <FormField label="Email" error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.ke"
          />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <div className="-mt-1 flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
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
          Log in
        </Button>
      </form>

      <p className="mt-5 flex gap-2 rounded-control bg-brand-50 px-3 py-2.5 text-xs text-ink-2">
        <Info size={15} className="mt-px shrink-0 text-brand-700" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">Employees:</strong> log in with the email and
          password your organisation admin gave you. There’s no separate employee sign-up.
        </span>
      </p>

      <p className="mt-6 text-center text-body text-ink-2">
        New organisation?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
