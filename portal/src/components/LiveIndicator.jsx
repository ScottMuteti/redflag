/* eslint-disable react/prop-types -- tiny presentational component */
import { cn } from '../lib/cn';

// Small pill showing whether the live event stream is connected. Pulses green
// while connected (the dashboard is updating in real time), grey while the
// stream is reconnecting.
export default function LiveIndicator({ live, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        live ? 'bg-success-bg text-success' : 'bg-page text-ink-3',
        className,
      )}
      title={live ? 'Updating in real time as events arrive' : 'Reconnecting to the live stream'}
      role="status"
    >
      <span className={cn('size-2 rounded-full', live ? 'animate-pulse bg-success' : 'bg-ink-3')} />
      {live ? 'Live' : 'Connecting…'}
    </span>
  );
}
