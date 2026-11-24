import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../api/client';

// Subscribes to the engine's live simulation-event stream (Server-Sent Events)
// and calls `onEvent(event)` for each one. Uses fetch (not the native
// EventSource) so the normal Authorization header is sent and no token appears
// in the URL. Reconnects automatically if the stream drops.
//
// `onEvent` may change every render; it is read through a ref so the stream is
// not torn down and reopened each time. Returns { live } for a status pill.
export function useLiveAttempts(onEvent, { enabled = true } = {}) {
  const [live, setLive] = useState(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!enabled) return undefined;
    const token = localStorage.getItem('redflag_token');
    if (!token) return undefined;

    let stopped = false;
    let controller;
    let retry;

    async function connect() {
      controller = new AbortController();
      try {
        const res = await fetch(`${API_BASE}/campaigns/events`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        // A dead session or forbidden role: stop, don't hammer the server.
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);

        setLive(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        // Read until the stream ends or the effect is cleaned up.
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE frames are separated by a blank line.
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';
          for (const frame of frames) {
            const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue; // comment heartbeat or retry directive
            try {
              handler.current?.(JSON.parse(dataLine.slice(5).trim()));
            } catch {
              /* ignore a malformed frame */
            }
          }
        }
      } catch {
        /* network error or abort — fall through to reconnect */
      } finally {
        setLive(false);
        if (!stopped) retry = setTimeout(connect, 3000);
      }
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      controller?.abort();
    };
  }, [enabled]);

  return { live };
}
