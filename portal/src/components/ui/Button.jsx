/* eslint-disable react/prop-types -- presentational primitives */
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary: 'border-brand-700 bg-brand-700 text-white hover:border-brand-600 hover:bg-brand-600',
  outline: 'border-line bg-card text-ink hover:bg-brand-50',
  ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-brand-50 hover:text-ink',
  danger: 'border-danger bg-danger text-white hover:opacity-90',
  white: 'border-white bg-white text-brand-800 hover:bg-brand-50',
  'white-outline': 'border-white-70 bg-transparent text-white hover:bg-white-10',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-2 px-3.5 text-body',
  lg: 'h-11 gap-2 px-5 text-label',
};

export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'outline',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    disabled,
    className,
    children,
    type,
    ...props
  },
  ref,
) {
  return (
    <Component
      ref={ref}
      type={Component === 'button' ? type || 'button' : undefined}
      disabled={Component === 'button' ? disabled || loading : undefined}
      aria-disabled={Component !== 'button' && disabled ? true : undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control border font-semibold whitespace-nowrap transition duration-150',
        'hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight size={16} strokeWidth={1.9} aria-hidden="true" />}
    </Component>
  );
});

export function IconButton({
  icon: Icon,
  label,
  variant = 'outline',
  size = 36,
  className,
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control border transition duration-150 disabled:opacity-50',
        variant === 'outline' && 'border-line bg-card text-ink-2 hover:bg-brand-50 hover:text-ink',
        variant === 'ghost' && 'border-transparent text-ink-2 hover:bg-brand-50 hover:text-ink',
        variant === 'dark' && 'border-transparent text-sidebar-text hover:bg-sidebar-hover',
        className,
      )}
      {...props}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
