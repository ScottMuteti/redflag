/* eslint-disable react/prop-types -- presentational primitives */
import { cn } from '../../lib/cn';

export function Card({
  as: Component = 'section',
  interactive,
  padded = true,
  index,
  className,
  style,
  children,
  ...props
}) {
  return (
    <Component
      className={cn(
        'min-w-0 rounded-card border border-line bg-card shadow-card',
        padded && 'p-5',
        index !== undefined && 'stagger',
        interactive && 'transition duration-150 hover:-translate-y-0.5 hover:shadow-hover',
        className,
      )}
      style={index !== undefined ? { '--i': index, ...style } : style}
      {...props}
    >
      {children}
    </Component>
  );
}

// Title left, optional action slot right ("See All" link, refresh button, small select).
export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-label font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-heading font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-body text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
