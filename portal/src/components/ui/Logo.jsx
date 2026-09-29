/* eslint-disable react/prop-types -- presentational primitive */
import { cn } from '../../lib/cn';

// White flag glyph on a dark-red tile + wordmark. `tone="dark"` for use on white backgrounds.
export function Logo({ tone = 'light', className, showWordmark = true }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--brand-700)" />
        <path d="M11 25V7" stroke="var(--white)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M11 8h11l-2.5 4.5L22 17H11z" fill="var(--white)" />
        <path d="M11 8h5v9h-5z" fill="var(--brand-100)" />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            'text-lg font-semibold tracking-tight',
            tone === 'light' ? 'text-white' : 'text-ink',
          )}
        >
          RedFlag
        </span>
      )}
    </span>
  );
}
