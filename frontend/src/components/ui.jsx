/* eslint-disable react/prop-types -- small presentational helpers */

export function Logo({ light = false }) {
  return (
    <span className={`logo${light ? ' logo-light' : ''}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M5 21V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 4h11l-2 4 2 4H5" fill="#e0323f" />
      </svg>
      RedFlag
    </span>
  );
}

const ICONS = {
  dashboard: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z',
  employees:
    'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4zm8 0c-.3 0-.7 0-1.1.1 1.2.9 2.1 2.1 2.1 3.9v3h7v-3c0-2.7-5.3-4-8-4z',
  campaigns: 'M3 11v2l13 5V6L3 11zm15-4v10h2V7h-2zM6 15l1.5 5h2.5l-1.4-4.4L6 15z',
  logout: 'M16 17l5-5-5-5v3H9v4h7v3zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z',
};

export function Icon({ name, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, wide = false }) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const RISK_TONE = { low: 'good', medium: 'warning', high: 'critical' };

export function RiskBadge({ level, score }) {
  if (!level) return <Badge>Not scored</Badge>;
  return (
    <Badge tone={RISK_TONE[level]}>
      {level[0].toUpperCase() + level.slice(1)} risk
      {score !== undefined && score !== null && ` · ${Math.round(score * 100)}%`}
    </Badge>
  );
}

const STATUS_TONE = {
  draft: 'neutral',
  scheduled: 'info',
  running: 'good',
  completed: 'neutral',
  assigned: 'info',
  in_progress: 'warning',
};

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'neutral'}>{status.replace('_', ' ')}</Badge>;
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Loading() {
  return <div className="loading">Loading…</div>;
}
