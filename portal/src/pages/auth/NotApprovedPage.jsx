import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, UserX } from 'lucide-react';
import { Button } from '../../components/ui';
import AuthLayout from './AuthLayout';

// Shown when Google or a passkey proves who someone is, but no admin has added
// them to RedFlag yet.
function NotApprovedPage() {
  const email = useLocation().state?.email;

  return (
    <AuthLayout>
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
        <UserX size={22} aria-hidden="true" />
      </span>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Account not approved</h1>
      <p className="mt-2 text-body text-ink-2">
        {email ? (
          <>
            <strong className="text-ink">{email}</strong> hasn’t been added to RedFlag yet.
          </>
        ) : (
          'This account hasn’t been added to RedFlag yet.'
        )}{' '}
        Please contact your manager and ask them to add your account to the platform.
      </p>
      <p className="mt-3 text-body text-ink-2">Once you’ve been added, you can log in here.</p>

      <Button as={Link} to="/login" variant="primary" size="lg" icon={ArrowLeft} className="mt-7 w-full">
        Back to log in
      </Button>
    </AuthLayout>
  );
}

export default NotApprovedPage;
