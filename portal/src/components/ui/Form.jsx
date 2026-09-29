/* eslint-disable react/prop-types -- presentational primitives */
import { Children, cloneElement, forwardRef, isValidElement, useId, useState } from 'react';
import { AlertCircle, ChevronDown, Eye, EyeOff, Search } from 'lucide-react';
import { cn } from '../../lib/cn';

const CONTROL =
  'w-full rounded-control border border-line bg-card px-3 text-body text-ink transition placeholder:text-ink-3 hover:border-brand-100 focus:border-brand-500 aria-[invalid=true]:border-danger';

// Wires label, hint and error to the single control inside it.
export function FormField({ label, hint, error, required, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child, {
        id: child.props.id || id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        required: child.props.required ?? required,
      })
    : child;

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <label htmlFor={child.props?.id || id} className="text-xs font-semibold text-ink-2">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {control}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={13} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(CONTROL, 'h-10', className)} {...props} />;
});

export function Textarea({ className, rows = 4, ...props }) {
  return <textarea rows={rows} className={cn(CONTROL, 'py-2.5', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <span className="relative block">
      <select className={cn(CONTROL, 'h-10 appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3"
        aria-hidden="true"
      />
    </span>
  );
}

export function PasswordInput({ className, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative block">
      <input
        type={shown ? 'text' : 'password'}
        className={cn(CONTROL, 'h-10 pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:bg-brand-50 hover:text-ink"
      >
        {shown ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-body text-ink-2',
        className,
      )}
    >
      <input type="checkbox" className="size-4 rounded border-line" {...props} />
      {label}
    </label>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-body font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-line transition peer-checked:bg-brand-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500" />
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-card transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

// Filled search: no border, 10px radius, icon on the left.
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
  className,
  ...props
}) {
  return (
    <span className={cn('relative block', className)}>
      <Search
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-search border-0 bg-search pr-3 pl-9 text-body text-ink placeholder:text-ink-3"
        {...props}
      />
    </span>
  );
}
