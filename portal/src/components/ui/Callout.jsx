/* eslint-disable react/prop-types -- presentational primitive */
import { useState } from 'react';
import { Info, Lightbulb, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { cn } from '../../lib/cn';

// A friendly, plain-language guidance banner for in-context help. Keep the copy
// short and action-oriented — it is aimed at non-technical users.
const TONES = {
  info: { icon: Info, box: 'border-brand-700/25 bg-brand-50', accent: 'text-brand-700' },
  tip: { icon: Lightbulb, box: 'border-brand-700/25 bg-brand-50', accent: 'text-brand-700' },
  success: { icon: ShieldCheck, box: 'border-success/30 bg-success-bg', accent: 'text-success' },
  warning: { icon: TriangleAlert, box: 'border-warning/40 bg-warning-bg', accent: 'text-warning' },
};

export function Callout({ tone = 'info', title, children, icon, dismissKey, className }) {
  const storageKey = dismissKey ? `redflag_callout_${dismissKey}` : null;
  const [hidden, setHidden] = useState(
    () => Boolean(storageKey) && localStorage.getItem(storageKey) === '1',
  );
  if (hidden) return null;

  const t = TONES[tone] || TONES.info;
  const Icon = icon || t.icon;

  function dismiss() {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setHidden(true);
  }

  return (
    <div
      className={cn('flex items-start gap-3 rounded-card border p-3.5 sm:p-4', t.box, className)}
      role="note"
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', t.accent)} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-body text-ink-2">
        {title && <p className="font-semibold text-ink">{title}</p>}
        <div className={cn(title && 'mt-0.5')}>{children}</div>
      </div>
      {storageKey && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 shrink-0 rounded-md p-1 text-ink-3 hover:bg-card hover:text-ink"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
