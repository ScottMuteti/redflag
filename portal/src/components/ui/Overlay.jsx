/* eslint-disable react/prop-types -- presentational primitives */
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button, IconButton } from './Button';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Escape to close, focus moved in on open and trapped with Tab, restored on close, body scroll locked.
function useDialog(open, onClose, panelRef) {
  // onClose is usually an inline arrow; a ref keeps the effect from re-running (and stealing focus) each render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    (panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE) || panel)?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, panelRef]);
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export function Modal({ open, onClose, title, description, footer, size = 'md', children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialog(open, onClose, panelRef);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 animate-fade bg-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100vh-2rem)] w-full animate-rise flex-col rounded-card bg-card shadow-pop',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-card font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" variant="ghost" size={32} onClick={onClose} />
        </div>
        <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  side = 'right',
  width = 440,
  children,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialog(open, onClose, panelRef);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-fade bg-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ width: `min(${width}px, 100vw)` }}
        className={cn(
          'absolute top-0 bottom-0 flex flex-col bg-card shadow-pop',
          side === 'right' ? 'right-0 animate-slide-in' : 'left-0 animate-slide-left',
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-card font-semibold text-ink">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 truncate text-xs text-ink-3">{subtitle}</p>}
            </div>
            <IconButton icon={X} label="Close" variant="ghost" size={32} onClick={onClose} />
          </div>
        )}
        <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onCancel} data-autofocus>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger-bg text-danger">
            <AlertTriangle size={18} aria-hidden="true" />
          </span>
        )}
        <p className="text-body text-ink-2">{message}</p>
      </div>
    </Modal>
  );
}
