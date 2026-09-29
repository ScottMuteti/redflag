/* eslint-disable react/prop-types -- presentational primitives */
import { AlertCircle, Inbox, RotateCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { initialsOf } from '../../lib/format';
import { Button } from './Button';

export function Skeleton({ className }) {
  return (
    <span className={cn('block animate-pulse rounded-md bg-line', className)} aria-hidden="true" />
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="text-card font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-body text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorCard({ message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-4',
        className,
      )}
    >
      <span className="flex items-center gap-2 text-body text-danger">
        <AlertCircle size={16} aria-hidden="true" />
        <span>
          <strong className="font-semibold">Couldn’t load this.</strong> {message}
        </span>
      </span>
      {onRetry && (
        <Button size="sm" icon={RotateCw} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

// Hover/focus tooltip for short hints (e.g. why a button is disabled).
export function Tooltip({ label, children, className }) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 rounded-md bg-tooltip px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

const AVATAR_SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-body', lg: 'size-14 text-card' };

export function Avatar({ name, icon: Icon, size = 'sm', tone = 'brand', className }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold',
        tone === 'brand' && 'bg-brand-100 text-brand-800',
        tone === 'dark' && 'bg-brand-800 text-white',
        tone === 'success' && 'bg-success-bg text-success',
        tone === 'danger' && 'bg-danger-bg text-danger',
        tone === 'neutral' && 'bg-neutral-bg text-ink-2',
        AVATAR_SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {Icon ? <Icon size={size === 'lg' ? 22 : 15} strokeWidth={1.9} /> : initialsOf(name) || '?'}
    </span>
  );
}
