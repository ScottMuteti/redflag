/* eslint-disable react/prop-types -- layout component */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { Avatar, IconButton, SearchInput } from '../ui';
import { firstNameOf } from '../../lib/format';
import { subtitleFor } from './nav';

function UserMenu({ user, settingsPath, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body text-ink hover:bg-brand-50 focus:bg-brand-50';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-1.5 rounded-control border border-line bg-card pr-2 pl-1 hover:bg-brand-50"
      >
        <Avatar name={user?.fullName} size="sm" tone="dark" className="rounded-md" />
        <ChevronDown size={14} className="text-ink-3" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-1.5 w-60 animate-fade rounded-card border border-line bg-card p-1 shadow-pop"
        >
          <div className="border-b border-line px-2.5 pt-1.5 pb-2.5">
            <p className="truncate text-body font-semibold text-ink">{user?.fullName}</p>
            <p className="truncate text-xs text-ink-3">{user?.email}</p>
          </div>
          <div className="pt-1">
            <Link
              role="menuitem"
              to={`${settingsPath}?tab=profile`}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <UserRound size={15} aria-hidden="true" /> Profile
            </Link>
            <Link
              role="menuitem"
              to={settingsPath}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Settings size={15} aria-hidden="true" /> Settings
            </Link>
            <button role="menuitem" type="button" className={itemClass} onClick={onLogout}>
              <LogOut size={15} aria-hidden="true" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sticky 72px bar: greeting + page subtitle, search, account menu.
function TopBar({ user, nav, onLogout, onOpenMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const settingsPath = nav.preferences.find((p) => p.label === 'Settings')?.to;

  function onSubmit(e) {
    e.preventDefault();
    navigate(`${nav.search}?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-line bg-card px-4 sm:px-6">
      <IconButton
        icon={Menu}
        label="Open menu"
        variant="ghost"
        className="xl:hidden"
        onClick={onOpenMenu}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-greet leading-tight font-bold text-ink">
          Hi, {firstNameOf(user?.fullName) || 'there'}
        </p>
        <p className="truncate text-xs text-ink-3">{subtitleFor(pathname)}</p>
      </div>
      <form role="search" onSubmit={onSubmit} className="hidden w-[280px] md:block">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={nav.search.includes('employees') ? 'Search employees…' : 'Search…'}
        />
      </form>
      <UserMenu user={user} settingsPath={settingsPath} onLogout={onLogout} />
    </header>
  );
}

export default TopBar;
