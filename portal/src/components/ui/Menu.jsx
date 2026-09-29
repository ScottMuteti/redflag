/* eslint-disable react/prop-types -- presentational primitives */
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * White bordered button with a popover menu.
 * - Action menu: items=[{ label, icon, onClick, disabled, danger, hint }]
 * - Select menu: options=[{ value, label }], value, onChange (shows a check on the current option)
 * iconOnly renders just the icon (e.g. a filter or "more" button).
 */
export function DropdownButton({
  label,
  icon: Icon,
  items,
  options,
  value,
  onChange,
  align = 'right',
  iconOnly = false,
  chevron = true,
  variant = 'outline',
  className,
  menuLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...rootRef.current.querySelectorAll('[role^="menuitem"]:not([disabled])')];
        const i = items.indexOf(document.activeElement);
        const next =
          e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    rootRef.current?.querySelector('[role^="menuitem"]:not([disabled])')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options?.find((o) => o.value === value);
  const text = label ?? current?.label;

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={iconOnly ? menuLabel || label : undefined}
        title={iconOnly ? menuLabel || label : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-control border text-body font-semibold transition',
          variant === 'outline' && 'border-line bg-card text-ink hover:bg-brand-50',
          variant === 'ghost' && 'border-transparent text-ink-2 hover:bg-brand-50',
          iconOnly ? 'w-9 justify-center' : 'px-3',
        )}
      >
        {Icon && <Icon size={16} strokeWidth={1.9} aria-hidden="true" />}
        {!iconOnly && <span>{text}</span>}
        {!iconOnly && chevron && (
          <ChevronDown size={15} className="text-ink-3" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-1.5 min-w-[180px] animate-fade rounded-card border border-line bg-card p-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {options?.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitemradio"
              aria-checked={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-body text-ink hover:bg-brand-50 focus:bg-brand-50"
            >
              {o.label}
              {o.value === value && (
                <Check size={15} className="text-brand-700" aria-hidden="true" />
              )}
            </button>
          ))}
          {items?.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.hint}
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body hover:bg-brand-50 focus:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50',
                item.danger ? 'text-danger' : 'text-ink',
              )}
            >
              {item.icon && <item.icon size={15} strokeWidth={1.9} aria-hidden="true" />}
              <span className="flex-1">{item.label}</span>
              {item.hint && <span className="text-micro text-ink-3">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
