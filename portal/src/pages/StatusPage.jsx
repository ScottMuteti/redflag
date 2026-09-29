/* eslint-disable react/prop-types -- page */
import { Link } from 'react-router-dom';
import { Compass, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NAV } from '../components/shell/nav';
import { Button, Logo } from '../components/ui';

const COPY = {
  404: {
    icon: Compass,
    title: 'Page not found',
    body: 'The page you’re looking for doesn’t exist or has moved.',
  },
  403: {
    icon: Lock,
    title: 'You don’t have access to this page',
    body: 'This area is for a different role. If you think that’s wrong, ask your organisation admin.',
  },
};

function StatusPage({ code = 404 }) {
  const { user } = useAuth();
  const { icon: Icon, title, body } = COPY[code];
  const home = user ? NAV[user.role]?.home || '/' : '/';

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="flex h-16 items-center bg-sidebar px-6">
        <Link to="/" aria-label="RedFlag home">
          <Logo />
        </Link>
      </header>
      <main className="grid flex-1 place-items-center p-6">
        <div className="max-w-md text-center">
          <p className="text-[64px] leading-none font-extrabold text-brand-700">{code}</p>
          <span className="mx-auto mt-4 mb-3 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Icon size={22} aria-hidden="true" />
          </span>
          <h1 className="text-heading font-bold text-ink">{title}</h1>
          <p className="mt-2 text-body text-ink-2">{body}</p>
          <Button as={Link} to={home} variant="primary" className="mt-6">
            {user ? 'Back to dashboard' : 'Go to homepage'}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default StatusPage;
