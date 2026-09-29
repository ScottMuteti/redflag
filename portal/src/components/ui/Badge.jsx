/* eslint-disable react/prop-types -- presentational primitives */
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatPoints } from '../../lib/format';

const TONES = {
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
  warning: 'bg-warning-bg text-warning',
  neutral: 'bg-neutral-bg text-ink-2',
  brand: 'bg-brand-100 text-brand-800',
};

// Tinted pill with a dot (or an icon). Colour is never the only signal: always pass a text label.
export function Badge({ tone = 'neutral', icon: Icon, dot = !Icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon size={13} strokeWidth={2} aria-hidden="true" />}
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

const STATUS = {
  completed: { tone: 'success', label: 'Completed' },
  running: { tone: 'warning', label: 'Running' },
  scheduled: { tone: 'neutral', label: 'Scheduled' },
  draft: { tone: 'neutral', label: 'Draft' },
  failed: { tone: 'danger', label: 'Failed' },
  assigned: { tone: 'brand', label: 'Assigned' },
  in_progress: { tone: 'warning', label: 'In progress' },
  active: { tone: 'success', label: 'Active' },
  trial: { tone: 'warning', label: 'Trial' },
  suspended: { tone: 'danger', label: 'Suspended' },
};

export function StatusBadge({ status }) {
  const meta = STATUS[status] || { tone: 'neutral', label: status };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const RISK = {
  low: { tone: 'success', icon: ShieldCheck, label: 'Low risk' },
  medium: { tone: 'warning', icon: AlertTriangle, label: 'Medium risk' },
  high: { tone: 'danger', icon: ShieldAlert, label: 'High risk' },
};

export function RiskPill({ level, score }) {
  if (!level) {
    return (
      <Badge tone="neutral" icon={ShieldQuestion}>
        Not scored
      </Badge>
    );
  }
  const meta = RISK[level];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
      {score !== undefined && score !== null && <span className="font-semibold">· {score}</span>}
    </Badge>
  );
}

export function Chip({ active, onClick, className, children }) {
  const Component = onClick ? 'button' : 'span';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? Boolean(active) : undefined}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-control border px-3 text-xs font-medium transition',
        active
          ? 'border-brand-700 bg-brand-50 text-brand-800'
          : 'border-line bg-card text-ink-2 hover:bg-brand-50',
        className,
      )}
    >
      {children}
    </Component>
  );
}

// "↗ 30% than last week". For vulnerability-type metrics a decrease is good: pass invertGood.
export function TrendText({ value, invertGood = false, label = 'than last week', className }) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn('text-xs text-ink-3', className)}>No earlier data</span>;
  }
  const up = value > 0;
  const flat = Math.abs(value) < 0.05;
  const good = flat ? null : invertGood ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-ink-3', className)}>
      {!flat && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-semibold',
            good ? 'text-success' : 'text-danger',
          )}
        >
          <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
          {formatPoints(value)}
          <span className="sr-only">{good ? '(improving)' : '(worsening)'}</span>
        </span>
      )}
      {flat ? 'No change' : ''} {label}
    </span>
  );
}
