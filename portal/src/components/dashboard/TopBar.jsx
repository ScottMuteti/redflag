/* eslint-disable react/prop-types -- small presentational component */
import { Bell, MessageCircle, Search } from 'lucide-react';
import IconButton from './IconButton';

function SparkMark() {
  return (
    <svg className="d-spark" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x="18.25"
          y="3"
          width="3.5"
          height="12"
          rx="1.75"
          fill="var(--accent-700)"
          transform={`rotate(${i * 30} 20 20)`}
        />
      ))}
    </svg>
  );
}

// `actions` replaces the default search + icon buttons on the right.
function TopBar({ name, subtitle, onSearch, hasMessages = false, actions }) {
  function handleSubmit(e) {
    e.preventDefault();
    onSearch?.(new FormData(e.currentTarget).get('q'));
  }

  return (
    <header className="d-topbar">
      <div className="d-greeting">
        <SparkMark />
        <div>
          <h1>Hello, {name}!</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {actions ? (
        <div className="d-topbar-actions">{actions}</div>
      ) : (
        <div className="d-topbar-actions">
          <form className="d-search" role="search" onSubmit={handleSubmit}>
            <input name="q" type="search" placeholder="Search..." aria-label="Search" />
            <button type="submit" aria-label="Search">
              <Search size={16} strokeWidth={2} />
            </button>
          </form>
          <IconButton icon={MessageCircle} label="Messages" dot={hasMessages} />
          <IconButton icon={Bell} label="Notifications" />
        </div>
      )}
    </header>
  );
}

export default TopBar;
