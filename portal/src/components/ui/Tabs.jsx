/* eslint-disable react/prop-types -- presentational primitives */
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

/** tabs: [{ value, label, count, icon }]. variant: 'underline' | 'pill' | 'vertical' */
export function Tabs({ tabs, value, onChange, variant = 'underline', label = 'Tabs', className }) {
  function onKeyDown(e) {
    const keys = variant === 'vertical' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.value === value);
    const next = tabs[(i + (e.key === keys[1] ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next.value);
    e.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={variant === 'vertical' ? 'vertical' : 'horizontal'}
      onKeyDown={onKeyDown}
      className={cn(
        variant === 'underline' && 'scrollbar-thin flex gap-5 overflow-x-auto border-b border-line',
        variant === 'pill' && 'inline-flex gap-1 rounded-control bg-search p-1',
        variant === 'vertical' && 'grid gap-1',
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            data-value={t.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex items-center gap-2 text-body font-semibold whitespace-nowrap transition',
              variant === 'underline' &&
                cn(
                  '-mb-px border-b-2 pt-1 pb-2.5',
                  active
                    ? 'border-brand-700 text-ink'
                    : 'border-transparent text-ink-3 hover:text-ink',
                ),
              variant === 'pill' &&
                cn(
                  'h-8 rounded-md px-3',
                  active ? 'bg-card text-ink shadow-card' : 'text-ink-3 hover:text-ink',
                ),
              variant === 'vertical' &&
                cn(
                  'h-10 rounded-control px-3 text-left',
                  active ? 'bg-brand-50 text-brand-800' : 'text-ink-2 hover:bg-brand-50',
                ),
            )}
          >
            {t.icon && <t.icon size={16} strokeWidth={1.8} aria-hidden="true" />}
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-micro font-semibold',
                  active ? 'bg-brand-700 text-white' : 'bg-neutral-bg text-ink-2',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// steps: ['Details', 'Template', ...]; current is the 0-based active step.
export function Stepper({ steps, current, className }) {
  return (
    <ol className={cn('flex items-center gap-2 overflow-x-auto', className)} aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step}
            className="flex min-w-0 items-center gap-2"
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold',
                done && 'bg-brand-700 text-white',
                active && 'border-2 border-brand-700 bg-brand-50 text-brand-800',
                !done && !active && 'border border-line bg-card text-ink-3',
              )}
            >
              {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-body whitespace-nowrap',
                active ? 'font-semibold text-ink' : 'text-ink-3',
              )}
            >
              {step}
              {done && <span className="sr-only"> (done)</span>}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn('mx-1 h-px w-6 shrink-0 sm:w-10', done ? 'bg-brand-700' : 'bg-line')}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
