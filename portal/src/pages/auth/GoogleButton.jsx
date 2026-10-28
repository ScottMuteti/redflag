/* eslint-disable react/prop-types -- page-local component */
import { useEffect, useRef } from 'react';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiPromise;

// Loads Google Identity Services once per page.
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  gsiPromise =
    gsiPromise ||
    new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        gsiPromise = undefined;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  return gsiPromise;
}

// Google's own "Continue with Google" button. Hands back the ID token, which the
// engine verifies before checking the account is pre-approved.
function GoogleButton({ clientId, onCredential, onError }) {
  const ref = useRef(null);
  // Keep the latest handlers without re-rendering Google's button each time.
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => handlers.current.onCredential(credential),
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(ref.current.offsetWidth || 400, 400),
        });
      })
      .catch((err) => !cancelled && handlers.current.onError(err.message));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return <div ref={ref} className="flex h-11 w-full justify-center" />;
}

export default GoogleButton;
