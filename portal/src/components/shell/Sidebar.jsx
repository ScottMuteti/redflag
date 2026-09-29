/* eslint-disable react/prop-types -- layout component */
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Logo } from '../ui';

function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-5 pb-2 text-micro font-semibold tracking-[0.12em] text-sidebar-label uppercase">
      {children}
    </p>
  );
}

const itemClass = ({ isActive }) =>
  cn(
    'flex h-10 items-center gap-3 rounded-control px-3 text-label font-medium transition-colors',
    isActive
      ? 'bg-sidebar-active text-white'
      : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
  );

function Item({ item, count, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} className={itemClass} onClick={onNavigate}>
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white-16 px-1.5 text-micro font-semibold text-white">
          {count}
          <span className="sr-only">
            {' '}
            {item.badge === 'pendingTraining' ? 'pending' : 'running'}
          </span>
        </span>
      )}
    </NavLink>
  );
}

// Dark maroon sidebar: logo, MENU, PREFERENCES (+ Logout).
function Sidebar({ nav, counts = {}, onLogout, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex h-full flex-col bg-sidebar px-3 pb-4">
      <div className="flex h-[72px] shrink-0 items-center border-b border-sidebar-divider px-2">
        <Logo />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <SectionLabel>Menu</SectionLabel>
        <div className="grid gap-1">
          {nav.menu.map((item) => (
            <Item key={item.to} item={item} count={counts[item.badge]} onNavigate={onNavigate} />
          ))}
        </div>
        <SectionLabel>Preferences</SectionLabel>
        <div className="grid gap-1">
          {nav.preferences.map((item) => (
            <Item key={item.to} item={item} onNavigate={onNavigate} />
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 items-center gap-3 rounded-control px-3 text-label font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
