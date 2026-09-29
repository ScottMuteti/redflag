/* eslint-disable react/prop-types -- provider */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

// Dark toasts, bottom-right. useToast().success('Saved') / .error(msg) / .info(msg)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone, message) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="fixed right-4 bottom-4 z-[60] grid w-[min(360px,calc(100vw-2rem))] gap-2"
        >
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className="flex animate-rise items-start gap-2.5 rounded-card bg-tooltip p-3.5 text-body text-white shadow-pop"
              >
                <Icon
                  size={17}
                  className={t.tone === 'error' ? 'text-danger-strong' : 'text-white'}
                  aria-hidden="true"
                />
                <span className="flex-1">{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="text-white-70 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
