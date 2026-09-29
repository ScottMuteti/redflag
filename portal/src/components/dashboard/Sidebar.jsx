/* eslint-disable react/prop-types -- small presentational component */
import { Link, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';

// Items with `active: false` are shortcuts to another page and never show as selected.
function SidebarItem({ item }) {
  const Icon = item.icon;
  const icon = <Icon size={20} strokeWidth={1.75} />;

  if (!item.to) {
    return (
      <button
        type="button"
        className="d-side-link"
        title={item.label}
        aria-label={item.label}
        disabled
      >
        {icon}
      </button>
    );
  }
  if (item.active === false) {
    return (
      <Link to={item.to} className="d-side-link" title={item.label} aria-label={item.label}>
        {icon}
      </Link>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `d-side-link${isActive ? ' active' : ''}`}
      title={item.label}
      aria-label={item.label}
    >
      {icon}
    </NavLink>
  );
}

function Sidebar({ items, footerItems = [], initials, userLabel, onLogout }) {
  return (
    <nav className="d-sidebar" aria-label="Main">
      <div className="d-side-group">
        {items.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
      </div>
      <div className="d-side-group">
        {footerItems.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
        <button
          type="button"
          className="d-side-link"
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={20} strokeWidth={1.75} />
        </button>
        <span className="d-side-avatar" title={userLabel}>
          {initials}
        </span>
      </div>
    </nav>
  );
}

export default Sidebar;
