import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Clock, Fingerprint, Info, MailCheck } from 'lucide-react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import { NAV } from '../../components/shell/nav';
import { getAuthProviders, resendLoginOtp } from '../../api/auth';
import { Button, FormField, Input, PasswordInput } from '../../components/ui';
import AuthLayout from './AuthLayout';
import GoogleButton from './GoogleButton';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passkeysSupported = browserSupportsWebAuthn();

function LoginPage() {
  const { beginLogin, beginGoogleLogin, completeLogin, loginWithPasskey, sessionExpired } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expired = sessionExpired || searchParams.get('expired') === '1';

  const [stage, setStage] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);

  useEffect(() => {
    getAuthProviders()
      .then((p) => setGoogleClientId(p.googleClientId))
      .catch(() => setGoogleClientId(null));
  }, []);

  // Password and Google both end in the emailed-code step.
  function startOtp({ challengeId: id, email: masked }, fallbackEmail) {
    setChallengeId(id);
    setMaskedEmail(masked || fallbackEmail);
    setStage('otp');
    setNotice('');
  }

  const goHome = (user) => navigate(NAV[user.role]?.home || '/');

  // Proven identity but no account: send them to ask their manager.
  function handleAuthError(err, fallback) {
    const data = err.response?.data;
    if (err.response?.status === 403 && data?.code === 'NOT_APPROVED') {
      navigate('/not-approved', { state: { email: data.email } });
      return;
    }
    setFormError(data?.message || fallback);
  }

  async function handleGoogle(credential) {
    setFormError('');
    setSubmitting(true);
    try {
      startOtp(await beginGoogleLogin(credential), '');
    } catch (err) {
      handleAuthError(err, 'Google sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasskey() {
    setFormError('');
    setSubmitting(true);
    try {
      goHome(await loginWithPasskey());
    } catch (err) {
      // NotAllowedError = the user closed the browser prompt; nothing to report.
      if (err.name !== 'NotAllowedError') handleAuthError(err, 'Passkey sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  function validateCredentials() {
    const next = {};
    if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCredentials(e) {
    e.preventDefault();
    setFormError('');
    if (!validateCredentials()) return;
    setSubmitting(true);
    try {
      startOtp(await beginLogin(email, password), email);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setFormError('');
    if (!/^\d{6}$/.test(code)) {
      setErrors({ code: 'Enter the 6-digit code' });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      goHome(await completeLogin(challengeId, code));
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not verify code');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setFormError('');
    setNotice('');
    setSubmitting(true);
    try {
      const { challengeId: id, email: masked } = await resendLoginOtp(challengeId);
      setChallengeId(id);
      if (masked) setMaskedEmail(masked);
      setCode('');
      setNotice('A new code is on its way.');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not resend code');
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === 'otp') {
    return (
      <AuthLayout>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Check your email</h1>
        <p className="mt-1 text-body text-ink-2">
          We sent a 6-digit code to <strong className="text-ink">{maskedEmail}</strong>. It expires
          in 10 minutes.
        </p>

        <form onSubmit={handleVerify} noValidate className="mt-7 grid gap-4">
          <FormField label="Verification code" error={errors.code}>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
            />
          </FormField>
          {notice && (
            <p className="flex items-center gap-2 rounded-control bg-brand-50 px-3 py-2.5 text-body text-brand-700">
              <MailCheck size={16} aria-hidden="true" />
              {notice}
            </p>
          )}
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
            Verify &amp; log in
          </Button>
        </form>

        <div className="mt-5 flex justify-between text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={submitting}
            className="font-semibold text-brand-700 hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => {
              setStage('credentials');
              setCode('');
              setFormError('');
              setNotice('');
            }}
            className="font-semibold text-ink-2 hover:underline"
          >
            Use a different account
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-body text-ink-2">Log in to your RedFlag account.</p>

      {expired && (
        <p className="mt-5 flex items-center gap-2 rounded-control bg-brand-50 px-3 py-2.5 text-body text-brand-700">
          <Clock size={16} aria-hidden="true" />
          Your session ended after 20 minutes. Please log in again.
        </p>
      )}

      <form onSubmit={handleCredentials} noValidate className="mt-7 grid gap-4">
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
          Continue
        </Button>
      </form>

      {(googleClientId || passkeysSupported) && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-2">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid gap-3">
            {googleClientId && (
              <GoogleButton
                clientId={googleClientId}
                onCredential={handleGoogle}
                onError={setFormError}
              />
            )}
            {passkeysSupported && (
              <Button
                size="lg"
                icon={Fingerprint}
                onClick={handlePasskey}
                disabled={submitting}
                className="w-full"
              >
                Sign in with a passkey
              </Button>
            )}
          </div>
        </>
      )}

      <p className="mt-5 flex gap-2 rounded-control bg-brand-50 px-3 py-2.5 text-xs text-ink-2">
        <Info size={15} className="mt-px shrink-0 text-brand-700" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-ink">Employees:</strong> log in with the email and
          password your organisation admin gave you. There’s no separate employee sign-up.
        </span>
      </p>

      <p className="mt-6 text-center text-body text-ink-2">
        New organisation?{' '}
        <Link to="/request-access" className="font-semibold text-brand-700 hover:underline">
          Request access
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
