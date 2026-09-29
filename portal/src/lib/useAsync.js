import { useCallback, useEffect, useState } from 'react';

// Runs an async loader and tracks loading / error / data, with a reload() for Retry buttons.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    loader()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch(
        (error) =>
          !cancelled &&
          setState({
            data: null,
            error: error.response?.data?.message || error.message || 'Something went wrong',
            loading: false,
          }),
      );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}

// Resolves to the value, or to `fallback` when the call fails — for optional panels.
export const settle = (promise, fallback) => promise.catch(() => fallback);
