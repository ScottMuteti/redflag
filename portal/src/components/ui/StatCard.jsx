/* eslint-disable react/prop-types -- presentational primitives */
import { cn } from '../../lib/cn';
import { formatPercent } from '../../lib/format';
import { Card } from './Card';
import { TrendText } from './Badge';
import { Sparkline } from './Charts';
import { Skeleton } from './Feedback';

/**
 * Label + bold period on top, big number with trend text below, sparkline with one bubble on the right.
 * trend is in points (e.g. -2.4). invertGood: a decrease is good (risk, click rate).
 */
export function StatCard({
  label,
  period,
  value,
  suffix,
  trend,
  trendLabel,
  invertGood = false,
  series,
  formatPoint,
  icon: Icon,
  loading,
  index,
  className,
}) {
  return (
    <Card index={index} className={cn('flex min-h-[132px] flex-col', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-body text-ink-2">
          {Icon && (
            <span className="grid size-7 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
            </span>
          )}
          {label}
        </span>
        {period && <span className="text-xs font-semibold text-ink">{period}</span>}
      </div>
      {loading ? (
        <div className="mt-4 grid gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : (
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0">
            <div className="text-stat leading-none font-bold text-ink">
              {value}
              {suffix && (
                <span className="ml-0.5 text-card font-semibold text-ink-3">{suffix}</span>
              )}
            </div>
            {trend !== undefined && (
              <TrendText
                value={trend}
                invertGood={invertGood}
                label={trendLabel}
                className="mt-2"
              />
            )}
          </div>
          {series && series.length >= 2 && (
            <div className="w-[46%] max-w-[180px] min-w-[110px] shrink-0">
              <Sparkline data={series} format={formatPoint} height={72} label={`${label} trend`} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Label left, bold % right, 6px bar underneath.
export function ProgressRow({ label, value, detail, className }) {
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value));
  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-body text-ink-2">{label}</span>
        <span className="text-body font-bold text-ink">{detail ?? formatPercent(value)}</span>
      </div>
      <MiniBar value={pct} label={label} />
    </div>
  );
}

export function MiniBar({ value, label, className }) {
  const pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className={cn('h-1.5 overflow-hidden rounded-full bg-brand-100', className)}
    >
      <div
        className="h-full rounded-full bg-brand-700 transition-[width] duration-300"
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}
