/* eslint-disable react/prop-types -- layout wrapper */
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Logo } from '../../components/ui';
import { AUTH_BENEFITS, HEADLINE } from '../../content/marketing';

// Faint repeating flag + shield outlines behind the brand panel.
function Pattern() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
      aria-hidden="true"
    >
      <defs>
        <pattern id="auth-pattern" width="96" height="96" patternUnits="userSpaceOnUse">
          <path d="M14 40V12h18l-4 7 4 7H14" fill="none" stroke="var(--white)" strokeWidth="2" />
          <path
            d="M66 56l14 5v10c0 9-6 15-14 18-8-3-14-9-14-18V61z"
            fill="none"
            stroke="var(--white)"
            strokeWidth="2"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#auth-pattern)" />
    </svg>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-card lg:flex-row">
      <aside className="relative overflow-hidden bg-linear-to-br from-brand-900 to-brand-700 text-white lg:w-[45%]">
        <Pattern />
        {/* Mobile: slim header band. */}
        <div className="relative flex h-16 items-center px-5 lg:hidden">
          <Link to="/" aria-label="RedFlag home">
            <Logo />
          </Link>
        </div>
        <div className="relative hidden h-full flex-col justify-between p-12 lg:flex">
          <Link to="/" aria-label="RedFlag home" className="w-fit">
            <Logo />
          </Link>
          <div>
            <h2 className="max-w-md text-[40px] leading-[1.1] font-extrabold tracking-tight">
              {HEADLINE.lead} <span className="text-brand-100">{HEADLINE.accent}</span>
            </h2>
            <ul className="mt-8 grid gap-3">
              {AUTH_BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-card text-white">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white-16">
                    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white-70">Security awareness for Kenyan organisations</p>
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

export default AuthLayout;
